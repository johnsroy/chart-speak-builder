
import { supabase } from '@/lib/supabase';
import { ProgressCallback } from './types';
import { ensureStorageBuckets } from './storageInit';

/**
 * Uploads a small file directly
 */
export const uploadSmallFile = async (
  file: File, 
  filePath: string,
  onProgress?: ProgressCallback
): Promise<{ data: any; error: any }> => {
  try {
    console.log(`Uploading small file (${(file.size / 1024).toFixed(2)} KB) directly`);
    
    // Start with initial progress
    if (onProgress) {
      onProgress(10);
    }
    
    // Set up progress simulation for small files since the API doesn't provide progress
    let progressValue = 10;
    const progressInterval = setInterval(() => {
      if (progressValue < 80) {
        progressValue += 5 + (Math.random() * 10);
        if (onProgress) {
          onProgress(Math.min(80, progressValue));
        }
      }
    }, 200);
    
    try {
      const uploadResult = await supabase.storage
        .from('datasets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
        
      // Clean up the progress interval
      clearInterval(progressInterval);
      
      if (uploadResult.error) {
        console.error('Storage upload error:', uploadResult.error);
        
        // If we got a permission error, try to fix the policies and retry
        if (uploadResult.error.message.includes('row-level security') || 
            uploadResult.error.message.includes('permission denied') ||
            uploadResult.error.message.includes('Unauthorized')) {
          
          console.warn("Permission error, attempting final policy fix...");
          
          // Force permission update as a last resort
          const { createStorageBucketsDirect } = await import('@/utils/storageUtils');
          await createStorageBucketsDirect();
          
          // Set progress to 50% to show we're retrying
          if (onProgress) {
            onProgress(50);
          }
          
          // Try the upload one more time
          const retryResult = await supabase.storage
            .from('datasets')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true
            });
            
          if (retryResult.error) {
            console.error('Retry storage upload failed:', retryResult.error);
            throw new Error(`File upload failed after policy fix: ${retryResult.error.message}`);
          }
          
          // Set progress to nearly complete
          if (onProgress) {
            onProgress(90);
          }
          
          uploadResult.data = retryResult.data;
        } else {
          throw new Error(`File upload failed: ${uploadResult.error.message}`);
        }
      }
      
      // Set progress to almost complete (we'll set to 100% after URL generation)
      if (onProgress) {
        onProgress(90);
      }
      
      // Handle case where data might be undefined or null
      if (!uploadResult.data) {
        // Provide a minimal compatible structure
        uploadResult.data = { 
          path: filePath,
          id: filePath,
          fullPath: `datasets/${filePath}`
        };
      } else if (!uploadResult.data.path) {
        // Make sure path is set for consistency
        uploadResult.data.path = filePath;
      }
      
      // Final progress
      if (onProgress) {
        setTimeout(() => onProgress(100), 300);
      }
      
      return uploadResult;
    } catch (uploadError) {
      // Clean up the progress interval on error
      clearInterval(progressInterval);
      throw uploadError;
    }
  } catch (error) {
    console.error("Error in uploadSmallFile:", error);
    return {
      data: null,
      error: {
        message: error instanceof Error ? error.message : String(error),
        status: 500
      }
    };
  }
};
