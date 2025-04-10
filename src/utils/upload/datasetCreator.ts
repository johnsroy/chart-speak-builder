
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
    storage_url: storageUrl,
    storage_type: 'datasets',
    user_id: userId,
  };
  
  // Only add non-null optional fields
  if (columnSchema) {
    datasetEntry.column_schema = columnSchema;
  }
  
  // Check if the is_large_file column exists before trying to use it
  try {
    const { error } = await supabase.rpc('check_column_exists', { 
      table_name: 'datasets',
      column_name: 'is_large_file'
    });
    
    // If the function doesn't exist or returns an error, default behavior is to not include the field
    if (!error && isLargeFile !== undefined) {
      datasetEntry.is_large_file = isLargeFile;
    }
  } catch (error) {
    console.warn("Unable to check if is_large_file column exists:", error);
    // Continue without adding the field
  }
  
  // Create dataset entry
  const { data: datasetData, error: datasetError } = await supabase
    .from('datasets')
    .insert([datasetEntry])
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
