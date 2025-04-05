import { supabase, createStorageBuckets, verifyStorageBuckets } from '@/lib/supabase';
import Papa from 'papaparse';
import { toast } from '@/hooks/use-toast';
import { User } from '@/services/authService';
import { Session } from '@supabase/supabase-js';

export interface Dataset {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  file_name: string;
  file_size: number;
  row_count: number;
  column_schema: Record<string, string>; // column name -> data type
  created_at: string;
  storage_type: 'supabase' | 's3' | 'azure' | 'gcs' | 'dropbox';
  storage_path: string;
}

const CHUNK_SIZE = 5 * 1024 * 1024;

class DataService {
  async previewSchemaInference(file: File): Promise<Record<string, string>> {
    return new Promise((resolve, reject) => {
      try {
        Papa.parse(file, {
          header: true,
          preview: 50,
          skipEmptyLines: true,
          complete: (results) => {
            if (!results.data || results.data.length === 0) {
              reject(new Error('The file appears to be empty or invalid'));
              return;
            }

            const schema = this._inferSchema(results.data);
            resolve(schema);
          },
          error: (error) => {
            reject(new Error(`Error parsing file: ${error.message}`));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async uploadDataset(
    file: File, 
    name: string, 
    description?: string, 
    user?: User | null, 
    userSession?: Session | null, 
    providedUserId?: string | null
  ) {
    try {
      let userId = null;
      
      if (providedUserId && typeof providedUserId === 'string') {
        console.log("Using explicitly provided userId:", providedUserId);
        
        if (providedUserId === 'test-admin-id') {
          userId = '00000000-0000-0000-0000-000000000000';
          console.log("Using special UUID for admin test user:", userId);
        } else {
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          if (!uuidRegex.test(providedUserId)) {
            console.error("Invalid user ID format for regular user:", providedUserId);
            throw new Error('Invalid user ID format. Please login again.');
          }
          userId = providedUserId;
        }
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user?.id) {
          console.error("No authenticated user found during dataset upload");
          throw new Error('User not authenticated');
        }
        
        userId = session.user.id;
        console.log("User authenticated for upload:", userId);
      }
      
      console.log("CRITICAL: Ensuring storage buckets exist before upload");
      const bucketsVerified = await verifyStorageBuckets();
      
      if (!bucketsVerified) {
        console.log("Buckets not verified, attempting to create them directly...");
        const creationResult = await createStorageBuckets();
        
        if (!creationResult) {
          console.error("Failed to create required storage buckets");
          throw new Error("Failed to create required storage infrastructure. Please try again later.");
        }
      }
      
      const parseResult = await new Promise<Papa.ParseResult<any>>((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          preview: 500,
          skipEmptyLines: true,
          complete: resolve,
          error: reject,
        });
      });

      if (!parseResult.data || parseResult.data.length === 0) {
        throw new Error('The CSV file appears to be empty or invalid');
      }

      const columnSchema = this._inferSchema(parseResult.data);
      
      const estimatedRowCount = this._estimateTotalRows(file, parseResult);
      
      const fileExt = file.name.split('.').pop() || '';
      const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
      
      const bucketName = 'datasets';
      
      const filePath = `${userId}/${uniqueFileName}`;
      
      console.log(`Attempting to upload ${file.name} (${file.size} bytes) to ${bucketName}/${filePath}`);

      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error("Error listing buckets:", bucketsError);
        
        await createStorageBuckets();
        
        const { data: retryBuckets, error: retryError } = await supabase.storage.listBuckets();
        if (retryError || !retryBuckets?.some(bucket => bucket.name === bucketName)) {
          throw new Error(`Failed to access or create storage buckets. Please try again later.`);
        }
      }
      
      const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
      
      if (!bucketExists) {
        console.error(`Bucket '${bucketName}' does not exist, attempting to create it directly`);
        
        const { data: createData, error: createError } = await supabase.storage.createBucket(bucketName, {
          public: false,
          fileSizeLimit: 50 * 1024 * 1024
        });
        
        if (createError) {
          console.error(`Failed to create bucket:`, createError);
          throw new Error(`Storage system not properly configured. Please contact support.`);
        }
        
        console.log(`Bucket ${bucketName} created successfully at the last minute`);
      } else {
        console.log(`Confirmed bucket '${bucketName}' exists`);
      }

      let uploadResult;
      if (file.size > 5 * 1024 * 1024) {
        uploadResult = await this._uploadLargeFile(file, filePath, userId, bucketName);
      } else {
        uploadResult = await this._uploadRegularFile(file, filePath, bucketName);
      }
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload file');
      }
      
      console.log("File uploaded successfully to storage:", uploadResult.path);
      
      const { data, error } = await supabase.from('datasets').insert({
        name,
        description,
        user_id: userId,
        file_name: file.name,
        file_size: file.size,
        row_count: estimatedRowCount,
        column_schema: columnSchema,
        storage_type: 'supabase',
        storage_path: filePath,
        storage_bucket: bucketName,
      }).select().single();
      
      if (error) {
        console.error("Dataset metadata insertion error:", error);
        await supabase.storage.from(bucketName).remove([filePath]);
        throw error;
      }
      
      console.log("Dataset created successfully:", data.id);
      return data;
    } catch (error) {
      console.error('Error uploading dataset:', error);
      throw error;
    }
  }

  async _uploadLargeFile(file: File, filePath: string, userId: string, bucketName = 'datasets') {
    console.log(`Using chunked upload for large file: ${file.size} bytes to bucket: ${bucketName}`);
    
    try {
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      let uploadedChunks = 0;

      const chunkResults = [];
      
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const chunk = file.slice(start, end);

        const partPath = `${filePath}.part${i}`;
        
        let chunkUploaded = false;
        let attempts = 0;
        const maxRetries = 5;
        
        while (!chunkUploaded && attempts < maxRetries) {
          try {
            if (attempts > 0) {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session) {
                throw new Error("Authentication session expired during chunked upload");
              }
              
              await new Promise(r => setTimeout(r, 1500 * Math.pow(2, attempts)));
            }
            
            const { data, error } = await supabase.storage
              .from(bucketName)
              .upload(partPath, chunk, {
                cacheControl: '3600',
                upsert: attempts > 0
              });
            
            if (error) {
              console.error(`Chunk ${i}/${totalChunks} upload attempt ${attempts + 1} failed:`, error);
              
              if (error.message) {
                if (error.message.includes('row-level security policy')) {
                  throw new Error(`Failed to upload chunk ${i} due to RLS policy: ${error.message}`);
                } else if (error.message.includes('Bucket not found')) {
                  throw new Error(`Storage bucket '${bucketName}' not found. Please verify bucket exists.`);
                }
              }
              
              attempts++;
              
              if (attempts < maxRetries) {
                await new Promise(r => setTimeout(r, 1500 * Math.pow(2, attempts)));
              } else {
                return { 
                  success: false, 
                  error: `Failed to upload chunk ${i} after ${maxRetries} attempts: ${error.message}` 
                };
              }
            } else {
              chunkUploaded = true;
              chunkResults.push({
                partPath,
                success: true
              });
              uploadedChunks++;
              console.log(`Uploaded chunk ${i + 1}/${totalChunks} (${((uploadedChunks / totalChunks) * 100).toFixed(1)}%)`);
            }
          } catch (error) {
            console.error(`Chunk ${i} upload error:`, error);
            attempts++;
            
            if (attempts < maxRetries) {
              await new Promise(r => setTimeout(r, 1500 * Math.pow(2, attempts)));
            } else {
              return { 
                success: false, 
                error: `Failed to upload chunk ${i} after ${maxRetries} attempts: ${error instanceof Error ? error.message : String(error)}` 
              };
            }
          }
        }
      }
      
      if (uploadedChunks === totalChunks) {
        console.log("All chunks uploaded successfully, file upload complete");
        return { success: true, path: filePath };
      } else {
        return { 
          success: false, 
          error: `Only ${uploadedChunks} of ${totalChunks} chunks were uploaded successfully` 
        };
      }
    } catch (error) {
      console.error("Chunked upload failed:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  async _uploadRegularFile(file: File, filePath: string, bucketName = 'datasets') {
    console.log(`Using regular upload for file: ${file.size} bytes to bucket: ${bucketName}`);
    
    let attempts = 0;
    const maxRetries = 5;
    
    while (attempts < maxRetries) {
      try {
        console.log(`Upload attempt ${attempts + 1} for ${file.name}`);
        
        if (attempts > 0) {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            throw new Error("Authentication session expired during upload");
          }
          
          await new Promise(r => setTimeout(r, 1500 * Math.pow(2, attempts)));
        }
        
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: attempts > 0
          });
        
        if (error) {
          console.error(`Upload attempt ${attempts + 1} failed:`, error);
          
          if (error.message) {
            if (error.message.includes('row-level security policy')) {
              throw new Error(`Upload failed due to RLS policy: ${error.message}`);
            } else if (error.message.includes('Bucket not found')) {
              throw new Error(`Storage bucket '${bucketName}' not found. Please verify bucket exists.`);
            }
          }
          
          attempts++;
          
          if (attempts === maxRetries) {
            return { success: false, error: error.message };
          }
        } else {
          console.log("File uploaded successfully");
          return { success: true, path: filePath };
        }
      } catch (uploadError) {
        console.error(`Upload attempt ${attempts + 1} error:`, uploadError);
        
        attempts++;
        
        if (attempts === maxRetries) {
          return { 
            success: false, 
            error: uploadError instanceof Error ? uploadError.message : String(uploadError)
          };
        }
        
        await new Promise(r => setTimeout(r, 1500 * Math.pow(2, attempts)));
      }
    }
    
    return { success: false, error: 'Exceeded maximum retry attempts' };
  }

  async getDatasets(specificUserId = null) {
    try {
      let userId;
      
      if (specificUserId) {
        if (specificUserId === 'test-admin-id') {
          userId = '00000000-0000-0000-0000-000000000000';
        } else {
          userId = specificUserId;
        }
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session || !session.user) {
          console.error("No authenticated user found when fetching datasets");
          throw new Error('User not authenticated');
        }
        
        userId = session.user.id;
      }
      
      console.log("Getting datasets for user:", userId);

      const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching datasets:", error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching datasets:', error);
      throw error;
    }
  }

  async getDataset(id: string) {
    try {
      const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) throw error;
      if (!data) throw new Error(`Dataset with ID ${id} not found`);
      return data;
    } catch (error) {
      console.error(`Error fetching dataset ${id}:`, error);
      throw error;
    }
  }

  async previewDataset(id: string, limit = 100) {
    try {
      const dataset = await this.getDataset(id);
      if (!dataset) throw new Error('Dataset not found');
      
      const { data, error } = await supabase.storage
        .from('datasets')
        .download(dataset.storage_path);
      
      if (error) {
        console.error("Storage download error:", error);
        throw error;
      }
      
      if (!data) {
        throw new Error('Downloaded file is empty or corrupted');
      }
      
      try {
        const text = await data.text();
        
        const parseResult = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          preview: limit,
          dynamicTyping: true
        });
        
        if (parseResult.errors && parseResult.errors.length > 0) {
          console.warn("CSV parsing warnings:", parseResult.errors);
        }
        
        return parseResult.data || [];
      } catch (parseError) {
        console.error("CSV parsing error:", parseError);
        throw new Error(`Error parsing CSV file: ${parseError.message}`);
      }
    } catch (error) {
      console.error(`Error previewing dataset ${id}:`, error);
      throw error;
    }
  }

  async deleteDataset(datasetId: string): Promise<void> {
    try {
      console.log(`Attempting to delete dataset with ID: ${datasetId}`);
      
      const { data: dataset, error: getError } = await supabase
        .from('datasets')
        .select('storage_path, storage_type')
        .eq('id', datasetId)
        .single();
      
      if (getError) {
        console.error('Error fetching dataset for deletion:', getError);
        throw new Error(`Failed to find dataset: ${getError.message}`);
      }
      
      if (!dataset) {
        throw new Error('Dataset not found');
      }
      
      if (dataset.storage_path) {
        const { error: storageError } = await supabase
          .storage
          .from(dataset.storage_type || 'datasets')
          .remove([dataset.storage_path]);
        
        if (storageError) {
          console.warn('Error deleting file from storage:', storageError);
        }
      }
      
      const { error: deleteError } = await supabase
        .from('datasets')
        .delete()
        .eq('id', datasetId);
      
      if (deleteError) {
        console.error('Error deleting dataset record:', deleteError);
        throw new Error(`Failed to delete dataset: ${deleteError.message}`);
      }
      
      console.log(`Successfully deleted dataset with ID: ${datasetId}`);
    } catch (error) {
      console.error('Error in deleteDataset:', error);
      throw error;
    }
  }

  async getStorageStats(userId: string = null) {
    try {
      let actualUserId = userId;
      
      if (!actualUserId) {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user?.id) {
          throw new Error('User not authenticated');
        }
        
        actualUserId = session.user.id;
      }
      
      if (actualUserId === 'test-admin-id') {
        actualUserId = '00000000-0000-0000-0000-000000000000';
      }
      
      const { data, error } = await supabase
        .from('datasets')
        .select('file_size, storage_bucket')
        .eq('user_id', actualUserId);
      
      if (error) {
        throw error;
      }
      
      const stats = {
        totalFiles: data.length,
        totalSize: data.reduce((acc, dataset) => acc + dataset.file_size, 0),
        coldStorageFiles: data.filter(d => d.storage_bucket === 'cold_storage').length,
        coldStorageSize: data.filter(d => d.storage_bucket === 'cold_storage')
          .reduce((acc, dataset) => acc + dataset.file_size, 0)
      };
      
      return stats;
    } catch (error) {
      console.error('Error getting storage stats:', error);
      throw error;
    }
  }

  async connectToS3(accessKey: string, secretKey: string, bucket: string, region: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !session.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.from('storage_connections').insert({
        user_id: session.user.id,
        storage_type: 's3',
        connection_details: {
          accessKey,
          secretKey: '**REDACTED**',
          bucket,
          region
        }
      }).select().single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error connecting to S3:', error);
      throw error;
    }
  }

  async connectToAzure(accountName: string, accessKey: string, containerName: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !session.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.from('storage_connections').insert({
        user_id: session.user.id,
        storage_type: 'azure',
        connection_details: {
          accountName,
          accessKey: '**REDACTED**',
          containerName
        }
      }).select().single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error connecting to Azure Storage:', error);
      throw error;
    }
  }

  async connectToGCS(projectId: string, bucketName: string, keyFile: File) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !session.user) {
        throw new Error('User not authenticated');
      }

      const filePath = `keys/${session.user.id}/${Date.now()}_${keyFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('secure')
        .upload(filePath, keyFile);
      
      if (uploadError) throw uploadError;

      const { data, error } = await supabase.from('storage_connections').insert({
        user_id: session.user.id,
        storage_type: 'gcs',
        connection_details: {
          projectId,
          bucketName,
          keyFilePath: filePath
        }
      }).select().single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error connecting to Google Cloud Storage:', error);
      throw error;
    }
  }

  async connectToDropbox(appKey: string, appSecret: string, accessToken: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !session.user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.from('storage_connections').insert({
        user_id: session.user.id,
        storage_type: 'dropbox',
        connection_details: {
          appKey,
          appSecret: '**REDACTED**',
          accessToken: '**REDACTED**'
        }
      }).select().single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error connecting to Dropbox:', error);
      throw error;
    }
  }

  _inferSchema(data: any[]): Record<string, string> {
    const schema: Record<string, string> = {};
    
    if (data.length === 0) return schema;
    
    const sample = data[0];
    Object.keys(sample).forEach(column => {
      let typeVotes: Record<string, number> = {
        'string': 0,
        'number': 0,
        'integer': 0,
        'date': 0,
        'boolean': 0,
        'null': 0
      };
      
      const sampleSize = Math.min(100, data.length);
      let nonNullValues = 0;
      
      for (let i = 0; i < sampleSize; i++) {
        const row = data[i];
        const value = row[column];
        
        if (value === null || value === undefined || value === '') {
          typeVotes.null++;
          continue;
        }
        
        nonNullValues++;
        
        if (value === true || value === false || 
            value === 'true' || value === 'false' || 
            value === 'TRUE' || value === 'FALSE' ||
            value === 'True' || value === 'False' ||
            value === 'yes' || value === 'no' ||
            value === 'YES' || value === 'NO' ||
            value === 'Y' || value === 'N' ||
            value === '1' || value === '0') {
          typeVotes.boolean++;
        } else if (!isNaN(Number(value)) && value !== '') {
          if (Number.isInteger(Number(value))) {
            typeVotes.integer++;
          } else {
            typeVotes.number++;
          }
        } else if (!isNaN(Date.parse(String(value))) && 
                String(value).includes('-') || 
                String(value).includes('/') || 
                String(value).includes(':')) {
          typeVotes.date++;
        } else {
          typeVotes.string++;
        }
      }
      
      if (nonNullValues === 0) {
        schema[column] = 'string';
        return;
      }
      
      let maxVotes = 0;
      let winningType = 'string';
      
      for (const [type, votes] of Object.entries(typeVotes)) {
        if (type !== 'null' && votes > maxVotes) {
          maxVotes = votes;
          winningType = type;
        }
      }
      
      if (winningType === 'integer' && typeVotes.number > 0) {
        const integerRatio = typeVotes.integer / nonNullValues;
        const numberRatio = typeVotes.number / nonNullValues;
        
        if (numberRatio > 0.2) {
          winningType = 'number';
        }
      }
      
      if (winningType === 'string' && typeVotes.date > 0) {
        const dateRatio = typeVotes.date / nonNullValues;
        if (dateRatio > 0.5) {
          winningType = 'date';
        }
      }
      
      if (typeVotes.null > sampleSize * 0.7 && nonNullValues > 0) {
        console.log(`Column ${column} is mostly null (${typeVotes.null} nulls out of ${sampleSize}), but detected as ${winningType}`);
      }
      
      schema[column] = winningType;
    });
    
    return schema;
  }

  _estimateTotalRows(file: File, parseResult: Papa.ParseResult<any>): number {
    const sampleRows = parseResult.data.length;
    
    const sampleData = parseResult.data.slice(0, Math.min(200, sampleRows));
    const sampleText = Papa.unparse(sampleData);
    const sampleBytes = new TextEncoder().encode(sampleText).length;
    
    if (sampleRows < 200 || sampleBytes > file.size * 0.5) {
      return sampleRows;
    }
    
    const bytesPerRow = sampleBytes / sampleData.length;
    
    const correctionFactor = 0.9;
    const estimatedRowCount = Math.round((file.size / bytesPerRow) * correctionFactor);
    
    console.log(`Estimated ${estimatedRowCount} rows in file of size ${file.size} bytes`);
    console.log(`Sample had ${sampleData.length} rows using ${sampleBytes} bytes (${bytesPerRow} bytes per row)`);
    
    return Math.min(estimatedRowCount, 1000000);
  }

  async getDatasetDirectFromStorage(datasetId: string): Promise<any[]> {
    try {
      const { data: dataset, error: getError } = await supabase
        .from('datasets')
        .select('*')
        .eq('id', datasetId)
        .single();
      
      if (getError) throw getError;
      if (!dataset) throw new Error('Dataset not found');
      
      console.log('Fetching dataset directly from storage:', dataset.storage_path);
      
      const { data: fileData, error: downloadError } = await supabase
        .storage
        .from('datasets')
        .download(dataset.storage_path);
      
      if (downloadError) throw downloadError;
      if (!fileData) throw new Error('No file data found');
      
      const extension = dataset.file_name.split('.').pop()?.toLowerCase();
      
      if (extension === 'csv') {
        const text = await fileData.text();
        const results = Papa.parse(text, { header: true, skipEmptyLines: true });
        return results.data;
      } else if (extension === 'json') {
        const text = await fileData.text();
        return JSON.parse(text);
      } else {
        throw new Error(`Unsupported file format: ${extension}`);
      }
    } catch (error) {
      console.error('Error getting dataset directly from storage:', error);
      throw error;
    }
  }
}

export const dataService = new DataService();
