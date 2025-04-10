
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
      let rowLimit = 2000;
      
      if (file.size > 50 * 1024 * 1024) { // If larger than 50MB, read only first 2MB for preview
        const blob = file.slice(0, 2 * 1024 * 1024);
        fileText = await blob.text();
        rowLimit = 500; // Limit rows for very large files
      } else if (file.size > 10 * 1024 * 1024) { // If larger than 10MB, read only first 5MB for preview
        const blob = file.slice(0, 5 * 1024 * 1024);
        fileText = await blob.text();
        rowLimit = 1000; // Limit rows for large files
      } else {
        fileText = await file.text();
      }
      
      // Get file content statistics
      const lines = fileText.split('\n');
      const estimatedRowCount = lines.length - 1; // Subtract header row
      
      // Parse CSV to generate preview
      const previewData = await parseCSV(fileText, rowLimit);
      
      if (previewData && previewData.length > 0) {
        sessionStorage.setItem(previewKey, JSON.stringify(previewData));
        console.log("Created preview data for file, stored in session storage with key:", previewKey);
        
        // Extract column schema
        if (previewData[0]) {
          const schema: Record<string, string> = {};
          
          // Sample multiple rows to better determine types
          const sampleSize = Math.min(10, previewData.length);
          const samples: Record<string, any[]> = {};
          
          // Initialize samples for each column
          Object.keys(previewData[0]).forEach(key => {
            samples[key] = [];
          });
          
          // Collect sample values for each column
          for (let i = 0; i < sampleSize; i++) {
            if (previewData[i]) {
              Object.entries(previewData[i]).forEach(([key, value]) => {
                if (samples[key]) {
                  samples[key].push(value);
                }
              });
            }
          }
          
          // Determine types based on samples
          Object.entries(samples).forEach(([key, values]) => {
            let isNumber = true;
            let isBoolean = true;
            let isDate = true;
            
            for (const value of values) {
              // Skip empty values
              if (value === null || value === undefined || value === '') continue;
              
              // Check if all values are numbers
              if (isNumber && isNaN(Number(value))) {
                isNumber = false;
              }
              
              // Check if all values are booleans
              if (isBoolean && value !== true && value !== false && value !== 'true' && value !== 'false') {
                isBoolean = false;
              }
              
              // Check if all values match date format
              if (isDate) {
                const dateValue = new Date(value);
                if (isNaN(dateValue.getTime())) {
                  isDate = false;
                }
              }
            }
            
            // Assign type based on checks
            if (isNumber) {
              schema[key] = 'number';
            } else if (isBoolean) {
              schema[key] = 'boolean';
            } else if (isDate) {
              schema[key] = 'date';
            } else {
              schema[key] = 'string';
            }
          });
          
          additionalProps.column_schema = schema;
          console.log("Extracted column schema for file:", schema);
          
          // Add estimated row count
          additionalProps.row_count = estimatedRowCount;
          console.log("Estimated row count:", estimatedRowCount);
        }
        
        // Cache data for direct access after upload
        const timestamp = Date.now();
        const datasetCacheKey = `dataset_${timestamp}`;
        try {
          sessionStorage.setItem(datasetCacheKey, JSON.stringify(previewData));
          console.log(`Data cached with key ${datasetCacheKey} for future dataset access`);
          additionalProps.dataset_cache_key = datasetCacheKey;
          additionalProps.preview_key = previewKey;
        } catch (cacheError) {
          console.warn("Failed to cache dataset:", cacheError);
        }
      }
    } catch (previewErr) {
      console.warn("Failed to extract preview/schema for file:", previewErr);
    }
  }
};
