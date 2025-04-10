
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
  isLargeFile: boolean = false
): Promise<Dataset> => {
  // Create dataset entry
  const { data: datasetData, error: datasetError } = await supabase
    .from('datasets')
    .insert([
      {
        name: name,
        description: description,
        file_name: file.name,
        file_size: file.size,
        storage_path: storagePath,
        storage_url: storageUrl,
        storage_type: 'datasets',
        user_id: userId,
        column_schema: columnSchema,
        is_large_file: isLargeFile
      }
    ])
    .select('id')
    .single();
    
  if (datasetError) {
    // Clean up storage if metadata insertion fails
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
};
