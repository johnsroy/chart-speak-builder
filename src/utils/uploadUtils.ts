
import { supabase } from '@/lib/supabase';
import { dataService } from '@/services/dataService';
import { Dataset } from '@/services/types/datasetTypes';
import { parseCSV } from '@/services/utils/fileUtils';

// Maximum file size constant - 10MB for Supabase free tier
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validates file for upload
 * @param file The file to validate
 * @throws Error if file is invalid
 */
export const validateFileForUpload = (file: File): void => {
  if (!file) {
    throw new Error('No file selected');
  }
  
  // Check file size (10MB limit for Supabase free tier)
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds the maximum limit of 10MB. Selected file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
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
    console.warn('No user ID provided, using system account');
    return 'fe4ab121-d26c-486d-92ca-b5cc4d99e984';
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
  }, 300); // Faster updates for more responsive UI
  
  return progressInterval;
};

/**
 * Performs file upload and dataset creation with fixed RLS policies
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
    
    // Validate file size before upload
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds the maximum limit of 10MB. Selected file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
    }
    
    // Generate a preview_key for storage
    const timestamp = Date.now();
    const previewKey = `preview_${timestamp}_${file.name}`;
    additionalProps.preview_key = previewKey;
    
    // Use system account if no valid user ID provided
    const validUserId = validateUserId(userId);
    
    // Store preview data in session storage
    if (file.size > 0 && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      try {
        console.log("Extracting schema and preview for file");
        const fileText = await file.text();
        const previewData = await parseCSV(fileText, 2000); // Increased from 1000 to 2000
        
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
          // This is critical - we store the data for immediate access after upload
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
    
    // Setup progress tracking
    if (onProgress) {
      const progressHandler = (progress: number) => {
        console.log(`Upload progress: ${progress}%`);
        onProgress(progress);
      };
      
      // Start with 10% to show immediate feedback
      progressHandler(10);
      
      // Setup progress simulation
      const progressInterval = setInterval(() => {
        progressHandler(Math.min(85, (Math.random() * 20) + 20));
      }, 500);
      
      // Clean up interval after upload completes or fails
      setTimeout(() => clearInterval(progressInterval), 30000); // Safety timeout
      
      // Attach the progress interval to additionalProps so we can clear it when done
      additionalProps._progressInterval = progressInterval;
    }
    
    // Upload dataset
    const dataset = await dataService.uploadDataset(
      file,
      name,
      description,
      null, // No existing dataset ID
      onProgress,
      validUserId,
      additionalProps // Pass additional props including preview_key
    );
    
    // Clean up progress interval if it exists
    if (additionalProps._progressInterval) {
      clearInterval(additionalProps._progressInterval);
    }
    
    // Set final progress to 100%
    if (onProgress) {
      onProgress(100);
    }
    
    return dataset;
  } catch (error) {
    console.error("Error during upload:", error);
    
    // Set progress to 0 to indicate failure
    if (onProgress) {
      onProgress(0);
    }
    
    throw error;
  }
};
