
import { supabase } from '@/lib/supabase';
import { parseCSV } from '@/services/utils/fileUtils';

/**
 * Creates a preview and extracts schema from a CSV file
 * @param file The file to preview
 * @param previewKey The key to store the preview under
 * @param additionalProps Additional properties to update
 */
export const createPreviewAndSchema = async (
  file: File,
  previewKey: string,
  additionalProps: Record<string, any> = {}
): Promise<void> => {
  if (file.size > 0 && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
    try {
      console.log("Extracting schema and preview for file");
      
      // For large files, only process a sample of the first few MB to extract schema
      let fileText;
      if (file.size > 10 * 1024 * 1024) { // If larger than 10MB, read only first 10MB for preview
        const blob = file.slice(0, 10 * 1024 * 1024);
        fileText = await blob.text();
      } else {
        fileText = await file.text();
      }
      
      const previewData = await parseCSV(fileText, 2000);
      
      if (previewData && previewData.length > 0) {
        sessionStorage.setItem(previewKey, JSON.stringify(previewData));
        console.log("Created preview data for file, stored in session storage with key:", previewKey);
        
        // Extract column schema
        if (previewData[0]) {
          const schema: Record<string, string> = {};
          Object.keys(previewData[0]).forEach(key => {
            const value = previewData[0][key];
            schema[key] = typeof value === 'number' ? 'number' : 
                          typeof value === 'boolean' ? 'boolean' :
                          'string';
          });
          additionalProps.column_schema = schema;
          console.log("Extracted column schema for file");
        }
        
        // Cache data for direct access after upload
        const timestamp = Date.now();
        const datasetCacheKey = `dataset_${timestamp}`;
        try {
          sessionStorage.setItem(datasetCacheKey, JSON.stringify(previewData));
          console.log(`Data cached with key ${datasetCacheKey} for future dataset access`);
          additionalProps.dataset_cache_key = datasetCacheKey;
        } catch (cacheError) {
          console.warn("Failed to cache dataset:", cacheError);
        }
      }
    } catch (previewErr) {
      console.warn("Failed to extract preview/schema for file:", previewErr);
    }
  }
};
