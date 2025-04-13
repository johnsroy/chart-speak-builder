
import { supabase } from '@/lib/supabase';
import { UploadResult, ProgressCallback } from './types';

/**
 * Uploads a small file directly to storage
 * @param file File to upload
 * @param filePath Path in storage bucket
 * @param onProgress Progress callback (optional)
 * @returns Object containing upload result
 */
export const uploadSmallFile = async (
  file: File,
  filePath: string,
  onProgress?: ProgressCallback
): Promise<UploadResult> => {
  try {
    console.log(`Uploading small file (${file.size} bytes) to ${filePath}`);
    
    // Start with 0% progress
    onProgress?.(0);
    
    // Make sure the file has the correct content type
    const contentType = file.type || 'application/octet-stream';
    console.log(`File content type: ${contentType}`);
    
    // Check storage permissions before uploading
    try {
      console.log("Checking storage permissions...");
      const { data, error } = await supabase.functions.invoke('storage-manager', {
        method: 'POST',
        body: { action: 'check-permissions', bucket: 'datasets' }
      });
      
      if (error || !data?.hasPermission) {
        console.warn("Permission check indicated issues:", error || data);
        // Continue anyway and let the actual upload attempt handle errors
      } else {
        console.log("Storage permissions verified");
      }
    } catch (permError) {
      console.warn("Error checking permissions:", permError);
    }
    
    // Update progress to indicate permissions check is complete
    onProgress?.(10);
    
    // Upload the file with explicit content type
    const { data, error } = await supabase.storage
      .from('datasets')
      .upload(filePath, file, {
        upsert: true,
        cacheControl: '3600',
        contentType
      });
      
    if (error) {
      console.error('Direct upload error:', error);
      
      // Try fallback approach by directly calling the storage-setup function
      try {
        console.log("Trying to fix storage permissions before retrying...");
        await supabase.functions.invoke('storage-setup', {
          method: 'POST',
          body: { action: 'create-buckets', force: true }
        });
        
        // Retry the upload after ensuring buckets exist
        console.log("Retrying upload after fixing permissions...");
        const { data: retryData, error: retryError } = await supabase.storage
          .from('datasets')
          .upload(filePath, file, {
            upsert: true,
            cacheControl: '3600',
            contentType
          });
          
        if (retryError) {
          console.error('Retry upload error:', retryError);
          throw retryError;
        }
        
        // If retry succeeded, continue as normal
        data = retryData;
        
      } catch (fallbackError) {
        console.error('Fallback approach failed:', fallbackError);
        throw error; // Throw the original error
      }
    }
    
    // Complete progress
    onProgress?.(100);
    
    // Get the public URL
    const publicUrl = supabase.storage
      .from('datasets')
      .getPublicUrl(filePath).data.publicUrl;
    
    return {
      storageUrl: publicUrl,
      storagePath: filePath
    };
  } catch (error) {
    console.error('Small file upload failed:', error);
    throw new Error(`Failed to upload small file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
