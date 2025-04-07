
import { supabase } from '@/lib/supabase';
import { dataService } from '@/services/dataService';
import { Dataset } from '@/services/types/datasetTypes';
import { parseCSV } from '@/services/utils/fileUtils';

/**
 * Validates file for upload
 * @param file The file to validate
 * @throws Error if file is invalid
 */
export const validateFileForUpload = (file: File): void => {
  if (!file) {
    throw new Error('No file selected');
  }
  
  // Check file size (100MB limit for general validation)
  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds the maximum limit of 100MB. Selected file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
  }
  
  // Check file type
  const allowedTypes = [
    'text/csv', 
    'application/json',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  const allowedExtensions = ['.csv', '.json', '.xls', '.xlsx'];
  
  const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  
  if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
    throw new Error(`Unsupported file type: ${file.type || fileExtension}. Please upload a CSV, JSON, or Excel file.`);
  }
};

/**
 * Extracts dataset name from file name
 * @param file File object
 * @returns Dataset name without extension
 */
export const getDatasetNameFromFile = (file: File): string => {
  const fileName = file.name;
  const lastDot = fileName.lastIndexOf('.');
  
  if (lastDot === -1) {
    return fileName;
  }
  
  // Remove extension and replace underscores with spaces
  return fileName.substring(0, lastDot).replace(/_/g, '_');
};

/**
 * Validates user ID
 * @param userId User ID to validate
 * @returns Validated user ID
 */
export const validateUserId = (userId?: string): string => {
  if (!userId || userId.trim() === '') {
    console.warn('No user ID provided, using default');
    return '00000000-0000-0000-0000-000000000000';
  }
  
  return userId;
};

/**
 * Simulates upload progress for better user experience
 * @param startPercent Starting percentage
 * @param totalSize Total file size
 * @param setProgress Progress setter function
 * @returns Interval ID to clear when done
 */
export const simulateProgress = (
  startPercent: number, 
  totalSize: number, 
  setProgress: React.Dispatch<React.SetStateAction<number>>
): NodeJS.Timeout => {
  setProgress(startPercent);
  
  const progressInterval = setInterval(() => {
    let currentProgress = 0;
    
    setProgress(prev => {
      currentProgress = prev;
      // Move slowly to 90% to simulate upload
      if (prev < 90) {
        // Larger files should progress more slowly
        const increment = totalSize > 5 * 1024 * 1024 ? 1 : 3;
        return Math.min(90, prev + increment);
      }
      return prev;
    });
    
    // If we've reached or exceeded 90%, clear the interval
    if (currentProgress >= 90) {
      clearInterval(progressInterval);
    }
  }, 500);
  
  return progressInterval;
};

/**
 * Performs file upload and dataset creation
 */
export const performUpload = async (
  file: File,
  name: string,
  description?: string,
  userId?: string,
  onProgress?: (progress: number) => void,
  additionalProps: Record<string, any> = {}
): Promise<Dataset> => {
  try {
    console.log("Starting file upload with props:", { name, size: file.size, userId, ...additionalProps });
    
    // Remove preview_key from additionalProps to avoid the error
    if (additionalProps.preview_key) {
      console.log("Preview key was provided but will be ignored as it's not supported in the schema");
      delete additionalProps.preview_key;
    }
    
    // Store preview data in session storage instead of trying to use preview_key in the database
    if (file.size > 5 * 1024 * 1024 && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      try {
        console.log("Extracting schema and preview for large file");
        const fileText = await file.text();
        const previewData = await parseCSV(fileText, 100);
        
        if (previewData && previewData.length > 0) {
          const timestamp = Date.now();
          const storageKey = `preview_${timestamp}_${file.name}`;
          sessionStorage.setItem(storageKey, JSON.stringify(previewData));
          console.log("Created preview data for large file, stored in session storage with key:", storageKey);
          
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
            console.log("Extracted column schema for large file");
          }
        }
      } catch (previewErr) {
        console.warn("Failed to extract preview/schema for large file:", previewErr);
      }
    }
    
    // Upload dataset
    const dataset = await dataService.uploadDataset(
      file,
      name,
      description,
      null, // No existing dataset ID
      onProgress,
      userId
    );
    
    return dataset;
  } catch (error) {
    console.error("Error during upload:", error);
    throw error;
  }
};
