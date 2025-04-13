
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
    
    // Ensure the storage bucket exists before uploading
    try {
      console.log("Ensuring storage bucket exists...");
      
      // Call storage-setup to make sure the bucket exists
      const { data: setupData, error: setupError } = await supabase.functions.invoke('storage-setup', {
        method: 'POST',
        body: { action: 'create-buckets', force: true }
      });
      
      if (setupError) {
        console.warn("Storage setup had issues:", setupError);
      } else {
        console.log("Storage bucket verified");
      }
      
      // Update progress to indicate preparation is complete
      onProgress?.(10);
    } catch (setupError) {
      console.warn("Error in storage setup:", setupError);
      // Continue anyway as the upload might still work
    }
    
    // Use let instead of const for data and error so we can reassign them later if needed
    let uploadData = null;
    let uploadError = null;
    
    // Upload the file with explicit content type
    const uploadResult = await supabase.storage
      .from('datasets')
      .upload(filePath, file, {
        upsert: true,
        cacheControl: '3600',
        contentType
      });
    
    // Assign response to our variables  
    uploadData = uploadResult.data;
    uploadError = uploadResult.error;
      
    if (uploadError) {
      console.error('Direct upload error:', uploadError);
      
      // Try fallback approach with direct policy update
      try {
        console.log("Trying to update storage policies before retrying...");
        
        // Call the storage-manager function to update policies
        const { data: managerData, error: managerError } = await supabase.functions.invoke('storage-manager', {
          method: 'POST',
          body: { 
            action: 'create-bucket', 
            bucketName: 'datasets',
            isPublic: true
          }
        });
        
        if (managerError) {
          console.warn("Policy update failed:", managerError);
        } else {
          console.log("Storage policies updated successfully");
        }
        
        // Retry the upload after updating policies
        console.log("Retrying upload...");
        const retryResult = await supabase.storage
          .from('datasets')
          .upload(filePath, file, {
            upsert: true,
            cacheControl: '3600',
            contentType
          });
          
        if (retryResult.error) {
          console.error('Retry upload error:', retryResult.error);
          throw retryResult.error;
        }
        
        // If retry succeeded, update our variables
        uploadData = retryResult.data;
        uploadError = null;
        
      } catch (fallbackError) {
        console.error('Fallback approach failed:', fallbackError);
        throw uploadError; // Throw the original error
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
