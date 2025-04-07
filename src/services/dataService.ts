
import { supabase } from '@/lib/supabase';
import { toast as sonnerToast } from "sonner";
import { Dataset, StorageStats } from './types/datasetTypes';
import { formatByteSize, getUniqueDatasetsByFilename } from '@/utils/storageUtils';
import { parseCSV, generateSampleData } from './utils/fileUtils';
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
   * Get unique datasets (latest version of each file)
   * @returns Promise resolving to array of unique datasets
   */
  getUniqueDatasets: async (): Promise<Dataset[]> => {
    try {
      const allDatasets = await dataService.getDatasets();
      return getUniqueDatasetsByFilename(allDatasets);
    } catch (error) {
      console.error("Error fetching unique datasets:", error);
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
        console.warn("Direct delete failed, falling back to alternative method:", directDeleteError);
        
        // Fall back to local database deletion only
        try {
          // Just delete the database record without edge function
          const { error } = await supabase
            .from('datasets')
            .delete()
            .eq('id', id);
            
          if (error) {
            console.error("Local delete error:", error);
            throw new Error(`Failed to delete dataset: ${error.message}`);
          }
          
          console.log(`Successfully deleted dataset ${id} from database only`);
          
          // Dispatch an event to notify subscribers
          const event = new CustomEvent('dataset-deleted', { detail: { datasetId: id } });
          window.dispatchEvent(event);
          
          return true;
        } catch (localDeleteError) {
          console.error("All deletion approaches failed:", localDeleteError);
          throw localDeleteError;
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
   * Preview dataset content using direct access instead of edge function
   * @param datasetId Dataset ID to preview
   * @returns Promise resolving to dataset preview data
   */
  previewDataset: async (datasetId: string): Promise<any[]> => {
    try {
      console.log(`Previewing dataset ${datasetId}...`);
      
      // First try the direct approach
      try {
        // Get the dataset details
        const dataset = await dataService.getDataset(datasetId);
        
        if (!dataset) {
          throw new Error('Dataset not found');
        }
        
        // For CSV files, we'll parse directly instead of using the edge function
        if (dataset.file_name.endsWith('.csv')) {
          try {
            // Try to get the file URL
            const { data: signedURL, error: urlError } = await supabase.storage
              .from(dataset.storage_type || 'datasets')
              .createSignedUrl(dataset.storage_path, 60);
              
            if (urlError || !signedURL) {
              throw new Error(`Failed to get signed URL: ${urlError?.message}`);
            }
            
            // Fetch the file content
            const response = await fetch(signedURL.signedUrl);
            if (!response.ok) {
              throw new Error(`Failed to fetch file: ${response.statusText}`);
            }
            
            const csvText = await response.text();
            const parsedData = await parseCSV(csvText);
            
            // Return a limited number of rows for preview
            return parsedData.slice(0, 100);
          } catch (csvError) {
            console.error("CSV direct parsing failed:", csvError);
            // Fall back to sample data below
          }
        }
        
        // JSON files could be handled similarly here
        
        // If we failed to get actual data or it's another file type,
        // generate sample data based on column schema
        console.log("Generating sample data based on schema");
        return generateSampleData(dataset.column_schema || {}, 20);
      } catch (directError) {
        console.error('Direct preview failed, falling back to sample data:', directError);
        
        try {
          // Get the dataset to extract schema
          const dataset = await dataService.getDataset(datasetId);
          
          if (!dataset) {
            throw new Error('Dataset not found');
          }
          
          // Generate sample data based on column schema or use defaults
          if (dataset.column_schema && Object.keys(dataset.column_schema).length > 0) {
            return generateSampleData(dataset.column_schema, 20);
          } else {
            // Create generic sample data if no schema is available
            return [
              { id: 1, name: "Sample 1", value: 42, category: "A" },
              { id: 2, name: "Sample 2", value: 18, category: "B" },
              { id: 3, name: "Sample 3", value: 73, category: "A" },
              { id: 4, name: "Sample 4", value: 91, category: "C" },
              { id: 5, name: "Sample 5", value: 30, category: "B" }
            ];
          }
        } catch (sampleError) {
          console.error('Error generating sample data:', sampleError);
          
          // Return minimal sample data as last resort
          return [
            { column1: "Value 1", column2: 123 },
            { column1: "Value 2", column2: 456 },
            { column1: "Value 3", column2: 789 }
          ];
        }
      }
    } catch (error) {
      console.error('Error previewing dataset:', error);
      throw error;
    }
  },

  /**
   * Get storage statistics with accurate calculations
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
      
      // Use the accurate calculation utility
      const uniqueDatasets = getUniqueDatasetsByFilename(datasets || []);
      
      // Calculate total storage used
      const totalSize = uniqueDatasets.reduce((sum, dataset) => sum + (dataset.file_size || 0), 0);
      
      // Calculate total fields
      const totalFields = uniqueDatasets.reduce(
        (sum, dataset) => sum + (dataset?.column_schema ? Object.keys(dataset.column_schema).length : 0), 
        0
      );
      
      // Get storage types
      const storageTypes = Array.from(new Set(uniqueDatasets.map(d => d.storage_type || 'unknown')));
      
      return {
        totalSize,
        datasetCount: uniqueDatasets.length,
        formattedSize: formatByteSize(totalSize),
        storageTypes,
        totalFields
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalSize: 0,
        datasetCount: 0,
        formattedSize: '0 B',
        storageTypes: [],
        totalFields: 0
      };
    }
  }
};
