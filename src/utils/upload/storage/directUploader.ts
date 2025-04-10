
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
    
    const uploadResult = await supabase.storage
      .from('datasets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });
      
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
        
        return retryResult;
      } else {
        throw new Error(`File upload failed: ${uploadResult.error.message}`);
      }
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
    
    if (onProgress) {
      onProgress(100);
    }
    
    return uploadResult;
  } catch (error) {
    console.error("Error in uploadSmallFile:", error);
    throw error;
  }
};
