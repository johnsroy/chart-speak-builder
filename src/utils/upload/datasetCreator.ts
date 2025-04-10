
import { supabase } from '@/lib/supabase';
import { Dataset } from '@/services/types/datasetTypes';
import { toast } from 'sonner';

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
    
    // Ensure we have at least a minimal column schema
    const finalColumnSchema = columnSchema && Object.keys(columnSchema).length > 0 
      ? columnSchema 
      : generateFallbackSchema(file.name);
    
    // Calculate an estimated row count based on file size
    // This will be updated by the data processor, but provides a reasonable initial value
    const estimatedRowCount = Math.max(1, Math.floor(file.size / 500)); // Rough estimate assuming 500 bytes per row
    
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
      row_count: estimatedRowCount,
      column_schema: finalColumnSchema
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
      
      // Try to extract more detailed error info
      let errorMessage = error.message;
      if (error.details) {
        errorMessage += `: ${error.details}`;
      }
      
      throw new Error(`Database error: ${errorMessage}`);
    }
    
    console.log("Dataset record created successfully:", data);
    
    // Cache preview data in session storage for immediate access
    try {
      const previewKey = `dataset_${data.id}`;
      if (!sessionStorage.getItem(previewKey)) {
        const cachedPreview = sessionStorage.getItem(`upload_preview_${Date.now()}`);
        if (cachedPreview) {
          sessionStorage.setItem(previewKey, cachedPreview);
          console.log(`Cached preview data stored with key: ${previewKey}`);
        }
      }
    } catch (cacheError) {
      console.warn("Error caching preview data:", cacheError);
    }
    
    // Store the last uploaded dataset ID for recovery purposes
    try {
      sessionStorage.setItem('last_uploaded_dataset', data.id);
    } catch (e) {
      console.warn("Could not store last uploaded dataset ID:", e);
    }
    
    return data as Dataset;
  } catch (error) {
    console.error("Error in createDatasetRecord:", error);
    
    // Improve error handling for better user feedback
    if (error instanceof Error) {
      throw new Error(`Could not create dataset record: ${error.message}`);
    } else if (error && typeof error === 'object') {
      try {
        const errorString = JSON.stringify(error);
        throw new Error(`Could not create dataset record: ${errorString}`);
      } catch (e) {
        throw new Error(`Could not create dataset record: Unknown object error`);
      }
    }
    
    throw new Error(`Could not create dataset record: Unknown error`);
  }
};

/**
 * Generate a fallback schema based on the file name if no schema could be determined
 */
function generateFallbackSchema(fileName: string): Record<string, string> {
  const schema: Record<string, string> = {};
  
  // Try to detect the type of dataset from the filename
  const lowerFileName = fileName.toLowerCase();
  
  if (lowerFileName.includes('electric') || lowerFileName.includes('vehicle')) {
    // Electric vehicle dataset schema
    schema['VIN'] = 'string';
    schema['County'] = 'string';
    schema['City'] = 'string';
    schema['State'] = 'string';
    schema['Postal Code'] = 'number';
    schema['Model Year'] = 'number';
    schema['Make'] = 'string';
    schema['Model'] = 'string';
    schema['Electric Vehicle Type'] = 'string';
    schema['Electric Range'] = 'number';
    schema['Base MSRP'] = 'number';
  } else if (lowerFileName.includes('sales')) {
    // Sales dataset schema
    schema['Date'] = 'date';
    schema['Product'] = 'string';
    schema['Quantity'] = 'number';
    schema['Price'] = 'number';
    schema['Customer'] = 'string';
    schema['Revenue'] = 'number';
  } else {
    // Generic dataset schema
    schema['id'] = 'number';
    schema['name'] = 'string';
    schema['value'] = 'number';
    schema['category'] = 'string';
    schema['date'] = 'date';
  }
  
  return schema;
}
