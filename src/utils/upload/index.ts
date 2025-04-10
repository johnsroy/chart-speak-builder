
import { Dataset } from '@/services/types/datasetTypes';
import { validateFileForUpload, getDatasetNameFromFile, MAX_FILE_SIZE } from './fileValidator';
import { validateUserId } from './userUtils';
import { simulateProgress } from './progressUtils';
import { createPreviewAndSchema } from './previewUtils';
import { uploadFileToStorage } from './storageUploader';
import { createDatasetRecord } from './datasetCreator';

/**
 * Performs file upload and dataset creation with chunk-based upload for large files
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
    
    // Use system account if no valid user ID provided
    const validUserId = validateUserId(userId);
    
    // Generate a preview_key for storage
    const timestamp = Date.now();
    const previewKey = `preview_${timestamp}_${file.name}`;
    additionalProps.preview_key = previewKey;
    
    // Store preview data in session storage
    await createPreviewAndSchema(file, previewKey, additionalProps);
    
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
    
    const fileExt = file.name.split('.').pop() || '';
    const safeFileName = `${name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.${fileExt}`;
    const filePath = `uploads/${validUserId}/${safeFileName}`;
    
    // Upload file to storage
    const { storageUrl, storagePath } = await uploadFileToStorage(
      file, 
      filePath, 
      onProgress
    );
    
    if (onProgress) {
      onProgress(90);
    }
    
    // Create dataset entry
    const dataset = await createDatasetRecord(
      name,
      description,
      file,
      storagePath,
      storageUrl,
      validUserId,
      additionalProps.column_schema,
      file.size > 50 * 1024 * 1024
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

// Re-export all utilities
export * from './fileValidator';
export * from './userUtils';
export * from './progressUtils';
export * from './previewUtils';
export * from './storageUploader';
export * from './datasetCreator';
