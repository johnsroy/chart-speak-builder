import { Dataset } from '@/services/types/datasetTypes';
import { validateFileForUpload, getDatasetNameFromFile, MAX_FILE_SIZE } from './fileValidator';
import { validateUserId } from './userUtils';
import { simulateProgress } from './progressUtils';
import { createPreviewAndSchema } from './previewUtils';
import { uploadFileToStorage } from './storage/uploader';
import { createDatasetRecord } from './datasetCreator';
import { supabase } from '@/lib/supabase';

/**
 * Ensures storage buckets exist before upload
 */
export const ensureStorageBucketsExist = async (): Promise<boolean> => {
  try {
    console.log("Checking if storage buckets exist...");
    
    // First check if the buckets already exist
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error("Error listing buckets:", error);
      // If we can't list buckets, try to create them
      return await createStorageBuckets();
    }
    
    const bucketNames = buckets?.map(b => b.name) || [];
    const requiredBuckets = ['datasets', 'secure', 'cold_storage'];
    const missingBuckets = requiredBuckets.filter(name => !bucketNames.includes(name));
    
    if (missingBuckets.length > 0) {
      console.log(`Missing buckets: ${missingBuckets.join(', ')}. Will create them.`);
      return await createStorageBuckets();
    }
    
    console.log("All required buckets exist");
    return true;
  } catch (error) {
    console.error("Error checking storage buckets:", error);
    return false;
  }
};

/**
 * Creates required storage buckets using the storage-setup edge function
 */
const createStorageBuckets = async (): Promise<boolean> => {
  try {
    console.log("Creating storage buckets using edge function...");
    
    // Try the direct API method first
    try {
      const { createStorageBucketsDirect } = await import('@/utils/storageUtils');
      const success = await createStorageBucketsDirect();
      
      if (success) {
        console.log("Storage buckets created directly");
        return true;
      }
    } catch (directError) {
      console.warn("Direct bucket creation failed:", directError);
    }
    
    // Fall back to edge function
    try {
      const { data, error } = await supabase.functions.invoke('storage-setup', {
        method: 'POST',
        body: { action: 'create-buckets' }
      });
      
      if (error) {
        console.error("Error calling storage-setup function:", error);
        return false;
      }
      
      console.log("Storage buckets created via edge function:", data);
      return data?.success || false;
    } catch (functionError) {
      console.error("Error with edge function approach:", functionError);
      return false;
    }
  } catch (error) {
    console.error("Error creating storage buckets:", error);
    return false;
  }
};

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
    
    // Ensure storage buckets exist before upload
    await ensureStorageBucketsExist();
    
    // Use system account if no valid user ID provided
    const validUserId = validateUserId(userId);
    
    // Generate a preview_key for storage
    const timestamp = Date.now();
    const previewKey = `preview_${timestamp}_${file.name}`;
    additionalProps.preview_key = previewKey;
    
    // Store preview data in session storage
    await createPreviewAndSchema(file, previewKey, additionalProps);
    
    // Setup progress tracking
    let lastProgress = 0;
    if (onProgress) {
      const progressHandler = (progress: number) => {
        // Ensure progress never goes backward
        const newProgress = Math.max(progress, lastProgress);
        lastProgress = newProgress;
        console.log(`Upload progress: ${newProgress}%`);
        onProgress(newProgress);
      };
      
      // Start with 10% to show immediate feedback
      progressHandler(10);
      
      // Setup progress simulation
      const progressInterval = setInterval(() => {
        const newProgress = Math.min(85, lastProgress + ((Math.random() * 5) + 1));
        progressHandler(newProgress);
        // Safety check to clear interval if it's been running too long
        if (newProgress >= 85) {
          clearInterval(progressInterval);
        }
      }, 800);
      
      // Clean up interval after upload completes or fails
      setTimeout(() => clearInterval(progressInterval), 30000); // Safety timeout
      
      // Attach the progress interval to additionalProps so we can clear it when done
      additionalProps._progressInterval = progressInterval;
    }
    
    const fileExt = file.name.split('.').pop() || '';
    const safeFileName = `${name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.${fileExt}`;
    const filePath = `uploads/${validUserId}/${safeFileName}`;
    
    // Upload file to storage - use more retries for larger files
    const maxRetries = file.size > 50 * 1024 * 1024 ? 3 : 1;
    let uploadError = null;
    let storageResult = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        storageResult = await uploadFileToStorage(
          file, 
          filePath, 
          onProgress ? (progress) => {
            // Ensure progress doesn't go backward
            const newProgress = Math.max(progress, lastProgress);
            lastProgress = newProgress;
            onProgress(newProgress);
          } : undefined
        );
        
        // If we got here, upload succeeded
        uploadError = null;
        break;
      } catch (error) {
        console.warn(`Upload attempt ${attempt + 1}/${maxRetries} failed:`, error);
        uploadError = error;
        
        // Add short delay between retries
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    // If all retries failed, try one last attempt with a fallback approach
    if (uploadError) {
      try {
        console.log("All normal upload attempts failed, trying fallback approach");
        
        // Force bucket creation first
        const { createStorageBucketsDirect } = await import('@/utils/storageUtils');
        await createStorageBucketsDirect();
        
        // Try a direct upload as last resort
        const uploadResult = await supabase.storage
          .from('datasets')
          .upload(filePath, file, { 
            upsert: true,
            cacheControl: '3600'
          });
          
        if (uploadResult.error) {
          console.error("Final fallback upload failed:", uploadResult.error);
          throw uploadError; // Throw the original error
        }
        
        // Create a URL manually
        const supabaseUrl = 'https://rehadpogugijylybwmoe.supabase.co';
        storageResult = {
          storageUrl: `${supabaseUrl}/storage/v1/object/public/datasets/${filePath}`,
          storagePath: filePath
        };
      } catch (fallbackError) {
        console.error("Fallback upload approach failed:", fallbackError);
        throw uploadError; // Throw the original error
      }
    }
    
    if (!storageResult) {
      throw new Error("Upload failed: Could not upload file to storage");
    }
    
    if (onProgress) {
      // Ensure we're at 90% before creating the dataset
      onProgress(90);
    }
    
    // Create dataset entry
    const dataset = await createDatasetRecord(
      name,
      description,
      file,
      storageResult.storagePath,
      storageResult.storageUrl,
      validUserId,
      additionalProps.column_schema
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
    
    // Improve error messages from objects
    if (error && typeof error === 'object' && !(error instanceof Error)) {
      throw new Error(`Upload failed: ${JSON.stringify(error)}`);
    }
    
    throw error;
  }
};

// Re-export all utilities
export * from './fileValidator';
export * from './userUtils';
export * from './progressUtils';
export * from './previewUtils';
export * from './storage/uploader';
export * from './storage/directUploader';
export * from './storage/chunkedUploader';
export * from './storage/storageInit';
export * from './datasetCreator';
