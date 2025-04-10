
import { supabase } from '@/lib/supabase';
import { Dataset } from '@/services/types/datasetTypes';

/**
 * Creates a dataset record in the database
 * @param name Dataset name
 * @param description Dataset description (optional)
 * @param file Original file
 * @param storagePath Path in storage
 * @param storageUrl Public URL to file
 * @param userId User ID
 * @param columnSchema Column schema for the dataset
 * @returns Dataset record
 */
export const createDatasetRecord = async (
  name: string,
  description: string | undefined,
  file: File,
  storagePath: string,
  storageUrl: string,
  userId: string,
  columnSchema?: Record<string, string>
): Promise<Dataset> => {
  try {
    console.log(`Creating dataset record for: ${name}`);
    
    // Create a dataset object with all required fields
    const dataset = {
      name: name.trim() || file.name,
      description: description?.trim(),
      file_name: file.name,
      file_size: file.size,
      storage_path: storagePath,
      storage_url: storageUrl,
      storage_type: 'supabase',
      user_id: userId,
      // Provide default values for required fields to avoid errors
      row_count: 0, // Will be updated by the data processor
      column_schema: columnSchema || {}
    };
    
    console.log("Dataset record data:", dataset);
    
    // Insert dataset into the database
    const { data, error } = await supabase
      .from('datasets')
      .insert(dataset)
      .select()
      .single();
      
    if (error) {
      console.error("Error creating dataset record:", error);
      
      // Attempt to fix common issues like missing fields
      const fixedDataset = {
        ...dataset,
        row_count: dataset.row_count || 0,
        column_schema: dataset.column_schema || {}
      };
      
      console.log("Retrying with fixed dataset:", fixedDataset);
      
      // Try insertion again with fixed dataset
      const { data: retryData, error: retryError } = await supabase
        .from('datasets')
        .insert(fixedDataset)
        .select()
        .single();
        
      if (retryError) {
        console.error("Retry also failed:", retryError);
        
        // Try one last approach - stripped down to minimum fields
        const minimalDataset = {
          name: name.trim() || file.name,
          file_name: file.name,
          file_size: file.size,
          storage_path: storagePath,
          storage_type: 'supabase',
          user_id: userId,
          row_count: 0,
          column_schema: {}
        };
        
        console.log("Final attempt with minimal dataset:", minimalDataset);
        
        const { data: finalData, error: finalError } = await supabase
          .from('datasets')
          .insert(minimalDataset)
          .select()
          .single();
          
        if (finalError) {
          console.error("All attempts failed:", finalError);
          throw new Error(`Could not create dataset record: ${finalError.message}`);
        }
        
        return finalData as Dataset;
      }
      
      return retryData as Dataset;
    }
    
    console.log("Dataset record created successfully:", data);
    return data as Dataset;
  } catch (error) {
    console.error("Error in createDatasetRecord:", error);
    
    // Improve error message for object errors
    if (error && typeof error === 'object') {
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error(`Could not create dataset record: ${JSON.stringify(error)}`);
      }
    }
    
    throw error;
  }
};
