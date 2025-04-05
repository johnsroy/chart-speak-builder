
import { supabase } from '@/lib/supabase';
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

export const dataService = {
  // Preview schema inference without uploading
  async previewSchemaInference(file: File): Promise<Record<string, string>> {
    return new Promise((resolve, reject) => {
      try {
        // Parse a preview of the file to infer schema
        Papa.parse(file, {
          header: true,
          preview: 50, // Read first 50 rows to infer schema
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
  },
  
  // Upload a dataset from a CSV file
  async uploadDataset(file: File, name: string, description?: string, user?: User | null, userSession?: Session | null) {
    try {
      console.log("Starting dataset upload process");
      
      // First check if user is authenticated
      let userId = null;
      
      // Use provided user and session if available
      if (user && userSession) {
        console.log("Using provided user authentication:", user.id);
        userId = user.id;
      } else {
        // Fall back to Supabase session check
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session || !session.user) {
          console.error("No authenticated user found during dataset upload");
          throw new Error('User not authenticated');
        }
        
        userId = session.user.id;
        console.log("User authenticated for upload:", userId);
      }
      
      // Parse the CSV to get schema and row count
      const parseResult = await new Promise<Papa.ParseResult<any>>((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          preview: 500, // Read first 500 rows to better infer schema
          skipEmptyLines: true,
          complete: resolve,
          error: reject,
        });
      });

      if (!parseResult.data || parseResult.data.length === 0) {
        throw new Error('The CSV file appears to be empty or invalid');
      }

      // Infer schema types from the parsed data
      const columnSchema = this._inferSchema(parseResult.data);
      
      // Estimate total rows in the file
      const estimatedRowCount = this._estimateTotalRows(file, parseResult);
      
      // Generate a unique filename using UUID to avoid collisions
      const fileExt = file.name.split('.').pop() || '';
      const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}.${fileExt}`;
      
      // Store the file in Supabase storage with retry logic
      const filePath = `${userId}/${uniqueFileName}`;
      
      // Attempt to upload with retry logic
      let uploadResult = null;
      let attempts = 0;
      let lastError = null;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          console.log(`Upload attempt ${attempts + 1} for ${file.name}`);
          
          const { data, error } = await supabase.storage
            .from('datasets')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: attempts > 0 // Only use upsert after first attempt
            });
          
          if (error) {
            console.error(`Upload attempt ${attempts + 1} failed:`, error);
            lastError = error;
            
            if (attempts === maxAttempts - 1) {
              throw error;
            }
          } else {
            uploadResult = data;
            console.log("File uploaded successfully to storage:", data);
            break;
          }
        } catch (uploadError) {
          console.error(`Upload attempt ${attempts + 1} error:`, uploadError);
          lastError = uploadError;
          
          if (attempts === maxAttempts - 1) {
            throw uploadError;
          }
        }
        
        attempts++;
        // Exponential backoff
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempts)));
      }
      
      if (!uploadResult) {
        throw new Error(lastError?.message || 'Failed to upload file after multiple attempts');
      }
      
      // Create dataset metadata entry
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
      }).select().single();
      
      if (error) {
        console.error("Dataset metadata insertion error:", error);
        // Clean up the uploaded file if metadata insertion fails
        await supabase.storage.from('datasets').remove([filePath]);
        throw error;
      }
      
      console.log("Dataset created successfully:", data.id);
      return data;
    } catch (error) {
      console.error('Error uploading dataset:', error);
      throw error;
    }
  },

  // Get all datasets for the current user
  async getDatasets() {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !session.user) {
        console.error("No authenticated user found when fetching datasets");
        throw new Error('User not authenticated');
      }
      
      console.log("User authenticated for getting datasets:", session.user.id);

      const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .eq('user_id', session.user.id)
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
  },

  // Get a specific dataset by ID
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
  },

  // Preview data from a dataset
  async previewDataset(id: string, limit = 100) {
    try {
      // First get the dataset metadata
      const dataset = await this.getDataset(id);
      if (!dataset) throw new Error('Dataset not found');
      
      // Get the file from storage
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
      
      // Parse the CSV file with error handling
      try {
        const text = await data.text();
        
        const parseResult = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          preview: limit,
          dynamicTyping: true // Automatically convert to numbers, booleans, etc.
        });
        
        if (parseResult.errors && parseResult.errors.length > 0) {
          console.warn("CSV parsing warnings:", parseResult.errors);
          // Continue despite warnings as we might have partial data
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
  },

  // Delete a dataset
  async deleteDataset(id: string) {
    try {
      // Get the dataset to find the storage path
      const dataset = await this.getDataset(id);
      if (!dataset) throw new Error('Dataset not found');
      
      // Delete the file from storage
      const { error: storageError } = await supabase.storage
        .from('datasets')
        .remove([dataset.storage_path]);
      
      if (storageError) throw storageError;
      
      // Delete the metadata
      const { error } = await supabase
        .from('datasets')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error(`Error deleting dataset ${id}:`, error);
      throw error;
    }
  },

  // Connect to external cloud storage (AWS S3)
  async connectToS3(accessKey: string, secretKey: string, bucket: string, region: string) {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !session.user) {
        throw new Error('User not authenticated');
      }

      // Store the connection details securely
      // In a production app, consider encrypting sensitive details
      const { data, error } = await supabase.from('storage_connections').insert({
        user_id: session.user.id,
        storage_type: 's3',
        connection_details: {
          accessKey,
          secretKey: '**REDACTED**', // Don't store the actual secret key in the database
          bucket,
          region
        }
      }).select().single();
      
      if (error) throw error;
      
      // TODO: Implement actual connection test
      
      return data;
    } catch (error) {
      console.error('Error connecting to S3:', error);
      throw error;
    }
  },

  // Connect to Azure Storage
  async connectToAzure(accountName: string, accessKey: string, containerName: string) {
    try {
      // Get current session
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
      
      // TODO: Implement actual connection test
      
      return data;
    } catch (error) {
      console.error('Error connecting to Azure Storage:', error);
      throw error;
    }
  },

  // Connect to Google Cloud Storage
  async connectToGCS(projectId: string, bucketName: string, keyFile: File) {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !session.user) {
        throw new Error('User not authenticated');
      }

      // Store the key file in a secure storage
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
      
      // TODO: Implement actual connection test
      
      return data;
    } catch (error) {
      console.error('Error connecting to Google Cloud Storage:', error);
      throw error;
    }
  },

  // Connect to Dropbox
  async connectToDropbox(appKey: string, appSecret: string, accessToken: string) {
    try {
      // Get current session
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
      
      // TODO: Implement actual connection test
      
      return data;
    } catch (error) {
      console.error('Error connecting to Dropbox:', error);
      throw error;
    }
  },

  // Helper function to infer schema from data
  _inferSchema(data: any[]): Record<string, string> {
    const schema: Record<string, string> = {};
    
    if (data.length === 0) return schema;
    
    // Get all column names
    const sample = data[0];
    Object.keys(sample).forEach(column => {
      // Try to determine the type from multiple rows for better accuracy
      let typeVotes: Record<string, number> = {
        'string': 0,
        'number': 0,
        'integer': 0,
        'date': 0,
        'boolean': 0,
        'null': 0
      };
      
      // Sample up to 100 rows for type detection (improved from 50)
      const sampleSize = Math.min(100, data.length);
      let nonNullValues = 0;
      
      for (let i = 0; i < sampleSize; i++) {
        const row = data[i];
        const value = row[column];
        
        if (value === null || value === undefined || value === '') {
          typeVotes.null++;
          continue; // Skip null/empty values
        }
        
        nonNullValues++;
        
        // Check if it's a boolean
        if (value === true || value === false || 
            value === 'true' || value === 'false' || 
            value === 'TRUE' || value === 'FALSE' ||
            value === 'True' || value === 'False' ||
            value === 'yes' || value === 'no' ||
            value === 'YES' || value === 'NO' ||
            value === 'Y' || value === 'N' ||
            value === '1' || value === '0') {
          typeVotes.boolean++;
        }
        // Check if it's a number
        else if (!isNaN(Number(value)) && value !== '') {
          if (Number.isInteger(Number(value))) {
            typeVotes.integer++;
          } else {
            typeVotes.number++;
          }
        }
        // Check if it's a date
        else if (!isNaN(Date.parse(String(value))) && 
                // Additional checks to avoid false positives
                (String(value).includes('-') || 
                 String(value).includes('/') || 
                 String(value).includes(':'))) {
          typeVotes.date++;
        }
        // Otherwise string
        else {
          typeVotes.string++;
        }
      }
      
      // If we have no non-null values, default to string
      if (nonNullValues === 0) {
        schema[column] = 'string';
        return;
      }
      
      // Find the most common type
      let maxVotes = 0;
      let winningType = 'string'; // Default to string if no clear winner
      
      for (const [type, votes] of Object.entries(typeVotes)) {
        if (type !== 'null' && votes > maxVotes) {
          maxVotes = votes;
          winningType = type;
        }
      }
      
      // Special case: if integer and number are close, prefer number
      if (winningType === 'integer' && typeVotes.number > 0) {
        const integerRatio = typeVotes.integer / nonNullValues;
        const numberRatio = typeVotes.number / nonNullValues;
        
        if (numberRatio > 0.2) { // If more than 20% are floating point numbers
          winningType = 'number';
        }
      }
      
      // Special case: if string and date are close, check if strings look like dates
      if (winningType === 'string' && typeVotes.date > 0) {
        const dateRatio = typeVotes.date / nonNullValues;
        if (dateRatio > 0.5) { // If more than 50% look like dates
          winningType = 'date';
        }
      }
      
      // If majority of values are null, but we have some data, ensure we still type it properly
      if (typeVotes.null > sampleSize * 0.7 && nonNullValues > 0) {
        console.log(`Column ${column} is mostly null (${typeVotes.null} nulls out of ${sampleSize}), but detected as ${winningType}`);
      }
      
      schema[column] = winningType;
    });
    
    return schema;
  },
  
  // Helper function to estimate total rows in a CSV file
  _estimateTotalRows(file: File, parseResult: Papa.ParseResult<any>): number {
    const sampleRows = parseResult.data.length;
    
    // Create a sample of the parsed data 
    const sampleData = parseResult.data.slice(0, Math.min(200, sampleRows));
    const sampleText = Papa.unparse(sampleData);
    const sampleBytes = new TextEncoder().encode(sampleText).length;
    
    // If we have a very small file or we parsed most of it already, just use the row count
    if (sampleRows < 200 || sampleBytes > file.size * 0.5) {
      return sampleRows;
    }
    
    // Otherwise estimate based on the size ratio
    // Calculate bytes per row on average from sample
    const bytesPerRow = sampleBytes / sampleData.length;
    
    // Estimate row count based on file size, with a correction factor
    // Correction factor is to account for CSV complexity differences
    const correctionFactor = 0.9; // Adjust if estimates are consistently off
    const estimatedRowCount = Math.round((file.size / bytesPerRow) * correctionFactor);
    
    console.log(`Estimated ${estimatedRowCount} rows in file of size ${file.size} bytes`);
    console.log(`Sample had ${sampleData.length} rows using ${sampleBytes} bytes (${bytesPerRow} bytes per row)`);
    
    // Cap to a reasonable maximum to avoid overflow issues
    return Math.min(estimatedRowCount, 1000000);
  }
};
