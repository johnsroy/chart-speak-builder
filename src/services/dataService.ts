
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
      console.log(`Attempting to delete dataset with ID: ${id}`);
      
      // First try using the direct database approach
      try {
        // Get dataset info to delete the file later
        const { data: dataset, error: getError } = await supabase
          .from('datasets')
          .select('*')
          .eq('id', id)
          .maybeSingle();
          
        if (getError) {
          console.error("Error getting dataset before delete:", getError);
          // Continue with deletion attempt even if we can't get the dataset
        }
        
        // Delete the record from the database
        const { error: deleteError } = await supabase
          .from('datasets')
          .delete()
          .eq('id', id);
          
        if (deleteError) {
          console.error("Error deleting dataset record:", deleteError);
          throw new Error(`Failed to delete dataset record: ${deleteError.message}`);
        }
        
        // Try to delete the file if we got the dataset
        if (dataset && dataset.storage_path) {
          try {
            const { error: storageError } = await supabase.storage
              .from(dataset.storage_type || 'datasets')
              .remove([dataset.storage_path]);
              
            if (storageError) {
              console.warn("Warning: Deleted record but failed to delete storage file:", storageError);
              // This is not a critical error since the record is gone
            }
          } catch (storageDeleteError) {
            console.warn("Storage deletion error:", storageDeleteError);
            // Non-critical error
          }
        }
        
        console.log(`Successfully deleted dataset ${id} using direct method`);
        
        // Dispatch an event to notify subscribers
        const event = new CustomEvent('dataset-deleted', { detail: { datasetId: id } });
        window.dispatchEvent(event);
        
        return true;
      } catch (directDeleteError) {
        console.warn("Direct delete failed, falling back to edge function:", directDeleteError);
        
        // Fall back to using the edge function
        const { data, error } = await supabase.functions.invoke('data-processor', {
          body: { action: 'delete', dataset_id: id }
        });
        
        if (error) {
          console.error("Edge function delete error:", error);
          throw new Error(`Failed to delete dataset: ${error.message}`);
        }
        
        if (data && data.success) {
          console.log(`Successfully deleted dataset ${id} using edge function`);
          
          // Dispatch an event to notify subscribers
          const event = new CustomEvent('dataset-deleted', { detail: { datasetId: id } });
          window.dispatchEvent(event);
          
          return true;
        } else {
          const errorMessage = data && data.error ? data.error : "Unknown error during delete operation";
          throw new Error(errorMessage);
        }
      }
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
      
      // Call the edge function to get data
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
      } else {
        throw new Error('No data returned from preview function');
      }
    } catch (error) {
      console.error('Error previewing dataset:', error);
      throw error;
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
