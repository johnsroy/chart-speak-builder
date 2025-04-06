
import { supabase } from '@/lib/supabase';
import { toast as sonnerToast } from "sonner";
import { Dataset, StorageStats } from './types/datasetTypes';
import { formatFileSize, parseCSV, generateSampleData } from './utils/fileUtils';
import { schemaService } from './schemaService';

/**
 * Service for handling data operations
 */
export const dataService = {
  
  /**
   * Get all datasets for the current user
   * @returns Promise resolving to array of datasets
   */
  getDatasets: async (): Promise<Dataset[]> => {
    console.log("Fetching all datasets...");
    try {
      // Fetch all datasets from Supabase
      const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .order('updated_at', { ascending: false });
        
      if (error) {
        throw new Error(`Failed to fetch datasets: ${error.message}`);
      }
      
      console.log(`Fetched ${data?.length || 0} datasets.`);
      return data || [];
    } catch (error) {
      console.error("Error fetching datasets:", error);
      return [];
    }
  },
  
  /**
   * Get a single dataset by ID
   * @param id Dataset ID
   * @returns Promise resolving to dataset object
   */
  getDataset: async (id: string): Promise<Dataset | null> => {
    try {
      const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .eq('id', id)
        .maybeSingle();
        
      if (error) {
        console.error("Error getting dataset:", error);
        throw new Error(`Failed to get dataset: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      console.error("Error getting dataset:", error);
      throw error;
    }
  },
  
  /**
   * Upload a new dataset
   * @param file File to upload
   * @param name Dataset name
   * @param description Dataset description
   * @param existingDatasetId ID of dataset to overwrite (optional)
   * @param onProgress Progress callback function (optional)
   * @param userId User ID (optional)
   * @returns Promise resolving to the created dataset
   */
  uploadDataset: async (
    file: File,
    name: string,
    description?: string,
    existingDatasetId?: string | null,
    onProgress?: (progress: number) => void,
    userId?: string | null
  ): Promise<Dataset> => {
    try {
      // Generate storage path
      const fileExtension = file.name.split('.').pop() || '';
      const timestamp = Date.now();
      const safeUserId = userId || '00000000-0000-0000-0000-000000000000';
      const storagePath = `${safeUserId}/${timestamp}_${file.name}`;
      
      // Upload file to storage
      const { data: fileData, error: uploadError } = await supabase.storage
        .from('datasets')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });
        
      if (uploadError) {
        console.error("Failed to upload file to storage:", uploadError);
        throw new Error(`File upload failed: ${uploadError.message}`);
      }
      
      // Infer schema from file
      let columnSchema = {};
      let rowCount = 0;
      
      try {
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          const schema = await schemaService.inferSchemaFromCSV(file);
          columnSchema = schema.schema;
          rowCount = schema.rowCount;
        } else if (file.name.endsWith('.json')) {
          const schema = await schemaService.inferSchemaFromJSON(file);
          columnSchema = schema.schema;
          rowCount = schema.rowCount;
        } else {
          // For Excel and other formats
          columnSchema = { "Column1": "string", "Value": "number" };
          rowCount = 0; // Can't determine without parsing
        }
      } catch (schemaError) {
        console.error("Error inferring schema:", schemaError);
        // Use a basic fallback schema
        columnSchema = { "Column1": "string", "Value": "number" };
      }
      
      // Create dataset record
      const dataset = {
        name,
        description,
        file_name: file.name,
        file_size: file.size,
        storage_type: 'datasets',
        storage_path: storagePath,
        row_count: rowCount,
        column_schema: columnSchema,
        user_id: safeUserId
      };
      
      let result;
      
      if (existingDatasetId) {
        // Update existing dataset
        const { data: updatedData, error: updateError } = await supabase
          .from('datasets')
          .update(dataset)
          .eq('id', existingDatasetId)
          .select()
          .single();
          
        if (updateError) {
          console.error("Error updating dataset record:", updateError);
          throw new Error(`Failed to update dataset record: ${updateError.message}`);
        }
        
        result = updatedData;
        console.log("Updated existing dataset:", result.id);
      } else {
        // Create new dataset
        const { data: insertedData, error: insertError } = await supabase
          .from('datasets')
          .insert([dataset])
          .select()
          .single();
          
        if (insertError) {
          console.error("Error creating dataset record:", insertError);
          throw new Error(`Failed to create dataset record: ${insertError.message}`);
        }
        
        result = insertedData;
        console.log("Created new dataset:", result.id);
      }
      
      return result;
      
    } catch (error) {
      console.error('Error uploading dataset:', error);
      throw error;
    }
  },
  
  /**
   * Delete a dataset by ID
   * @param id Dataset ID to delete
   * @returns Promise resolving when delete is complete
   */
  deleteDataset: async (id: string): Promise<boolean> => {
    try {
      // Call the data processor edge function to handle deletion of both the file and database record
      const { error } = await supabase.functions.invoke('data-processor', {
        body: { action: 'delete', dataset_id: id }
      });
      
      if (error) {
        throw new Error(`Failed to delete dataset: ${error.message}`);
      }
      
      // Dispatch an event to notify subscribers
      const event = new CustomEvent('dataset-deleted', { detail: { datasetId: id } });
      window.dispatchEvent(event);
      
      return true;
    } catch (error) {
      console.error('Error deleting dataset:', error);
      throw error;
    }
  },
  
  /**
   * Preview a dataset schema
   * @param file File to infer schema from
   * @returns Promise resolving to inferred schema
   */
  previewSchemaInference: async (file: File): Promise<Record<string, string>> => {
    return schemaService.previewSchemaInference(file);
  },
  
  /**
   * Preview dataset content
   * @param datasetId Dataset ID to preview
   * @returns Promise resolving to dataset preview data
   */
  previewDataset: async (datasetId: string): Promise<any[]> => {
    try {
      console.log(`Previewing dataset ${datasetId}...`);
      
      // Try to use the edge function to transform data
      try {
        const { data, error } = await supabase.functions.invoke('data-processor', {
          body: { action: 'preview', dataset_id: datasetId }
        });
        
        if (error) {
          console.error('Error previewing via transform function:', error);
          throw error;
        }
        
        if (data?.data && Array.isArray(data.data)) {
          console.log(`Loaded ${data.data.length} rows of preview data`);
          return data.data;
        }
      } catch (transformError) {
        console.error('Error previewing via transform function:', transformError);
      }
      
      // Fallback: Get dataset info and try to download the file directly
      try {
        const dataset = await dataService.getDataset(datasetId);
        
        if (!dataset) {
          throw new Error('Dataset not found');
        }
        
        // Download the file from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from(dataset.storage_type || 'datasets')
          .download(dataset.storage_path);
          
        if (downloadError) {
          console.error('Storage download error:', downloadError);
          throw new Error(`Failed to download file: ${JSON.stringify(downloadError)}`);
        }
        
        let parsedData: any[] = [];
        
        // Parse file based on type
        if (dataset.file_name.endsWith('.csv')) {
          const text = await fileData.text();
          parsedData = parseCSV(text);
        } else if (dataset.file_name.endsWith('.json')) {
          const text = await fileData.text();
          const json = JSON.parse(text);
          parsedData = Array.isArray(json) ? json : [json];
        } else {
          // Unsupported format
          throw new Error('Unsupported file format');
        }
        
        // Limit to 100 rows for preview
        return parsedData.slice(0, 100);
      } catch (fileError) {
        console.error('Error getting dataset:', fileError);
      }
      
      // Fallback: Use generated sample data based on schema
      try {
        const dataset = await dataService.getDataset(datasetId);
        
        if (!dataset || !dataset.column_schema) {
          throw new Error('Dataset or schema not found');
        }
        
        // Generate sample data based on the schema
        return generateSampleData(dataset.column_schema, 50);
      } catch (generateError) {
        console.error('Error previewing dataset:', generateError);
        throw generateError;
      }
    } catch (error) {
      console.error('Error previewing dataset:', error);
      
      // Return a minimal dataset as a last resort
      return [
        { Category: 'Sample A', Value: 100 },
        { Category: 'Sample B', Value: 200 },
        { Category: 'Sample C', Value: 300 }
      ];
    }
  },

  /**
   * Get storage statistics
   * @param userId User ID to get stats for
   * @returns Promise resolving to storage stats
   */
  getStorageStats: async (userId: string): Promise<StorageStats> => {
    try {
      const { data: datasets, error } = await supabase
        .from('datasets')
        .select('*')
        .eq('user_id', userId);
        
      if (error) {
        throw error;
      }
      
      // Calculate total storage used
      const totalSize = datasets?.reduce((sum, dataset) => sum + (dataset.file_size || 0), 0) || 0;
      const datasetCount = datasets?.length || 0;
      
      // Get storage types
      const storageTypes = Array.from(new Set(datasets?.map(d => d.storage_type) || []));
      
      return {
        totalSize,
        datasetCount,
        formattedSize: formatFileSize(totalSize),
        storageTypes
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalSize: 0,
        datasetCount: 0,
        formattedSize: '0 B',
        storageTypes: []
      };
    }
  }
};
