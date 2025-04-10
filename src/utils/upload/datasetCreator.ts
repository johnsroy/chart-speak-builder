
import { supabase } from '@/lib/supabase';
import { Dataset } from '@/services/types/datasetTypes';

/**
 * Creates a dataset record in the database
 * @param name Dataset name
 * @param description Dataset description
 * @param file File details
 * @param storagePath Path in storage
 * @param storageUrl URL to access the file
 * @param userId User ID
 * @param columnSchema Schema information
 * @param isLargeFile Whether this is a large file
 * @returns Created dataset
 */
export const createDatasetRecord = async (
  name: string,
  description: string | undefined,
  file: { name: string; size: number },
  storagePath: string,
  storageUrl: string,
  userId: string,
  columnSchema?: Record<string, string>,
  isLargeFile?: boolean
): Promise<Dataset> => {
  // Prepare dataset entry, handling optional fields
  const datasetEntry: any = {
    name: name,
    description: description,
    file_name: file.name,
    file_size: file.size,
    storage_path: storagePath,
    storage_type: 'datasets',
    user_id: userId,
  };
  
  // Only add non-null optional fields
  if (columnSchema) {
    datasetEntry.column_schema = columnSchema;
  }
  
  // Try to add storageUrl but don't worry if it fails
  try {
    datasetEntry.storage_url = storageUrl;
  } catch (error) {
    console.warn("Could not add storage_url field, but continuing without it:", error);
  }
  
  // Try to add isLargeFile but don't worry if it fails
  try {
    if (isLargeFile !== undefined) {
      datasetEntry.is_large_file = isLargeFile;
    }
  } catch (error) {
    console.warn("Could not add is_large_file field, but continuing without it:", error);
  }
  
  // Create dataset entry - use insert instead of upsert to avoid conflicts
  console.log("Creating dataset record with data:", {
    ...datasetEntry,
    storage_url: storageUrl ? "Present" : "Missing",
  });
  
  try {
    const { data: datasetData, error: datasetError } = await supabase
      .from('datasets')
      .insert([datasetEntry])
      .select('id')
      .single();
      
    if (datasetError) {
      console.error("Dataset creation error:", datasetError);
      
      // If storage_url column doesn't exist, try again without it
      if (datasetError.message.includes('storage_url')) {
        console.log("Retrying without storage_url field");
        delete datasetEntry.storage_url;
        
        const { data: retryData, error: retryError } = await supabase
          .from('datasets')
          .insert([datasetEntry])
          .select('id')
          .single();
          
        if (retryError) {
          // Clean up storage if metadata insertion fails again
          try {
            await supabase.storage.from('datasets').remove([storagePath]);
          } catch (cleanupError) {
            console.error("Error cleaning up storage after failed dataset creation:", cleanupError);
          }
          throw new Error(`Could not save dataset metadata: ${retryError.message}`);
        }
        
        // If retry succeeded, use that result
        const { data: fullDataset, error: getDatasetError } = await supabase
          .from('datasets')
          .select('*')
          .eq('id', retryData.id)
          .single();
          
        if (getDatasetError) {
          console.warn("Could not fetch complete dataset after creation:", getDatasetError);
          return retryData as Dataset;
        }
        
        return fullDataset as Dataset;
      }
      
      // For other errors, clean up storage and throw
      try {
        await supabase.storage.from('datasets').remove([storagePath]);
      } catch (cleanupError) {
        console.error("Error cleaning up storage after failed dataset creation:", cleanupError);
      }
      throw new Error(`Could not save dataset metadata: ${datasetError.message}`);
    }
    
    // Return complete dataset object
    const { data: fullDataset, error: getDatasetError } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', datasetData.id)
      .single();
      
    if (getDatasetError) {
      console.warn("Could not fetch complete dataset after creation:", getDatasetError);
      return datasetData as Dataset;
    }
    
    return fullDataset as Dataset;
  } catch (error) {
    console.error("Exception creating dataset:", error);
    
    // Final fallback - create a minimal dataset record
    try {
      const minimalDataset = {
        name: name,
        description: description || "",
        file_name: file.name,
        file_size: file.size,
        storage_path: storagePath,
        storage_type: 'datasets',
        user_id: userId,
      };
      
      const { data, error } = await supabase
        .from('datasets')
        .insert([minimalDataset])
        .select('id')
        .single();
        
      if (error) {
        throw error;
      }
      
      return data as Dataset;
    } catch (finalError) {
      console.error("Final attempt to create dataset failed:", finalError);
      throw new Error(`Could not create dataset record: ${finalError instanceof Error ? finalError.message : String(finalError)}`);
    }
  }
};
