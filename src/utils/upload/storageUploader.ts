
import { supabase } from '@/lib/supabase';
import { testBucketPermissions } from '@/utils/storageUtils';

/**
 * Uploads a file to storage
 * @param file File to upload
 * @param filePath Path in storage bucket
 * @param onProgress Progress callback (optional)
 * @returns Object containing storage URL and storage path
 */
export const uploadFileToStorage = async (
  file: File,
  filePath: string,
  onProgress?: (progress: number) => void
): Promise<{ storageUrl: string; storagePath: string }> => {
  try {
    console.log(`Attempting to upload file to: datasets/${filePath}`);
    
    // First test if we have permissions by uploading a small test file
    const hasPermission = await testBucketPermissions('datasets');
    
    if (!hasPermission) {
      console.warn("Permission test failed, retrying bucket setup...");
      const { updateAllStoragePolicies } = await import('@/utils/storageUtils');
      await updateAllStoragePolicies();
    }
    
    // For smaller files, upload directly
    const { data, error } = await supabase.storage
      .from('datasets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // Use upsert to overwrite if exists
      });
      
    if (error) {
      console.error('Storage upload error:', error);
      
      // If we got a permission error, try to fix the policies
      if (error.message.includes('row-level security') || 
          error.message.includes('permission denied')) {
        console.warn("Permission error, attempting to fix policies...");
        const { updateAllStoragePolicies } = await import('@/utils/storageUtils');
        await updateAllStoragePolicies();
        
        // Try the upload again
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
        
        // If retry succeeded, use this result
        data = retryResult.data;
      } else {
        throw new Error(`File upload failed: ${error.message}`);
      }
    }
    
    if (!data || !data.path) {
      throw new Error('Upload succeeded but no path returned');
    }
    
    const storageUrl = supabase.storage.from('datasets').getPublicUrl(filePath).data.publicUrl;
    
    return {
      storageUrl,
      storagePath: filePath
    };
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
};
