import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';

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
      
      // Parse the CSV to get schema and row count
      const parseResult = await new Promise<Papa.ParseResult<any>>((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          preview: 100, // Read first 100 rows to infer schema
          complete: resolve,
          error: reject,
        });
      });

      // Infer schema types from the parsed data
      const columnSchema = this._inferSchema(parseResult.data);
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session || !session.user) {
        console.error("No authenticated user found during dataset upload");
        throw new Error('User not authenticated');
      }
      
      console.log("User authenticated for upload:", session.user.id);

      // Store the file in Supabase storage
      const filePath = `datasets/${session.user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('datasets')
        .upload(filePath, file);
      
      if (uploadError) {
        console.error("File upload error:", uploadError);
        throw uploadError;
      }
      
      console.log("File uploaded successfully to storage");
      
      // Create dataset metadata entry
      const { data, error } = await supabase.from('datasets').insert({
        name,
        description,
        user_id: session.user.id,
        file_name: file.name,
        file_size: file.size,
        row_count: parseResult.data.length,
        column_schema: columnSchema,
        storage_type: 'supabase',
        storage_path: filePath,
      }).select().single();
      
      if (error) {
        console.error("Dataset metadata insertion error:", error);
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
        .single();
      
      if (error) throw error;
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
      
      if (error) throw error;
      
      // Parse the CSV file
      const text = await data.text();
      const parseResult = Papa.parse(text, {
        header: true,
        preview: limit,
      });
      
      return parseResult.data;
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
      // Try to determine the type from the first non-null value
      let type = 'string'; // default type
      
      for (const row of data) {
        const value = row[column];
        if (value !== null && value !== undefined && value !== '') {
          // Check if it's a number
          if (!isNaN(Number(value))) {
            type = 'number';
            // Check if it's an integer
            if (Number.isInteger(Number(value))) {
              type = 'integer';
            }
          }
          // Check if it's a date
          else if (!isNaN(Date.parse(value))) {
            type = 'date';
          }
          // Otherwise keep it as string
          break;
        }
      }
      
      schema[column] = type;
    });
    
    return schema;
  }
};
