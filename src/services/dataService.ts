import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';
import { toast } from '@/hooks/use-toast';

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
  // Upload a dataset from a CSV file
  async uploadDataset(file: File, name: string, description?: string) {
    try {
      console.log("Starting dataset upload process");
      
      // First check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !session.user) {
        console.error("No authenticated user found during dataset upload");
        throw new Error('User not authenticated');
      }
      
      console.log("User authenticated for upload:", session.user.id);
      
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
      
      // Store the file in Supabase storage with retry logic
      const filePath = `datasets/${session.user.id}/${Date.now()}_${file.name}`;
      
      // Attempt to upload with retry logic
      let uploadResult = null;
      let attempts = 0;
      const maxAttempts = 3;
      
      while (attempts < maxAttempts) {
        try {
          const { data, error } = await supabase.storage
            .from('datasets')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });
          
          if (error) {
            console.error(`Upload attempt ${attempts + 1} failed:`, error);
            
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
          
          if (attempts === maxAttempts - 1) {
            throw uploadError;
          }
        }
        
        attempts++;
        // Exponential backoff
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempts)));
      }
      
      if (!uploadResult) {
        throw new Error('Failed to upload file after multiple attempts');
      }
      
      // Create dataset metadata entry
      const { data, error } = await supabase.from('datasets').insert({
        name,
        description,
        user_id: session.user.id,
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
        'boolean': 0
      };
      
      // Sample up to 50 rows for type detection
      const sampleSize = Math.min(50, data.length);
      let nonNullValues = 0;
      
      for (let i = 0; i < sampleSize; i++) {
        const row = data[i];
        const value = row[column];
        
        if (value === null || value === undefined || value === '') {
          continue; // Skip null/empty values
        }
        
        nonNullValues++;
        
        // Check if it's a boolean
        if (typeof value === 'boolean' || value === 'true' || value === 'false') {
          typeVotes.boolean++;
        }
        // Check if it's a number
        else if (!isNaN(Number(value))) {
          if (Number.isInteger(Number(value))) {
            typeVotes.integer++;
          } else {
            typeVotes.number++;
          }
        }
        // Check if it's a date
        else if (!isNaN(Date.parse(String(value)))) {
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
      let winningType = 'string';
      
      for (const [type, votes] of Object.entries(typeVotes)) {
        if (votes > maxVotes) {
          maxVotes = votes;
          winningType = type;
        }
      }
      
      // Special case: if integer and number are close, prefer number
      if (winningType === 'integer' && typeVotes.number > 0) {
        const integerRatio = typeVotes.integer / nonNullValues;
        const numberRatio = typeVotes.number / nonNullValues;
        
        if (numberRatio > 0.3) { // If more than 30% are floating point numbers
          winningType = 'number';
        }
      }
      
      schema[column] = winningType;
    });
    
    return schema;
  },
  
  // Helper function to estimate total rows in a CSV file
  _estimateTotalRows(file: File, parseResult: Papa.ParseResult<any>): number {
    const sampleRows = parseResult.data.length;
    const sampleBytes = new TextEncoder().encode(Papa.unparse(parseResult.data)).length;
    
    // If sample is small, just use its row count
    if (sampleRows < 100 || sampleBytes > file.size * 0.5) {
      return sampleRows;
    }
    
    // Otherwise estimate based on the size ratio
    const bytesPerRow = sampleBytes / sampleRows;
    const estimatedRowCount = Math.round(file.size / bytesPerRow);
    
    // Cap to a reasonable maximum to avoid overflow issues
    return Math.min(estimatedRowCount, 1000000);
  }
};
