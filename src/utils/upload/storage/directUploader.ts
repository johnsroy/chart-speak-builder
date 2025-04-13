
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
      
      // Try first to use RPC to create the bucket with proper policies
      try {
        console.log("Creating bucket via RPC...");
        const { data: rpcData, error: rpcError } = await supabase.rpc('create_public_storage_policies', {
          bucket_name: 'datasets'
        });
        
        if (rpcError) {
          console.warn("RPC bucket creation had issues:", rpcError);
        } else {
          console.log("Bucket policies created via RPC");
        }
      } catch (rpcError) {
        console.warn("RPC approach failed:", rpcError);
      }
      
      // Call storage-manager to create the bucket with proper permissions
      const { data: managerData, error: managerError } = await supabase.functions.invoke('storage-manager', {
        method: 'POST',
        body: { 
          action: 'create-bucket', 
          bucketName: 'datasets',
          isPublic: true
        }
      });
      
      if (managerError) {
        console.warn("Storage manager had issues:", managerError);
      } else {
        console.log("Storage bucket verified via edge function");
      }
      
      // Update progress to indicate preparation is complete
      onProgress?.(10);
    } catch (setupError) {
      console.warn("Error in storage setup:", setupError);
      // Continue anyway as the upload might still work
    }
    
    // Attempt the upload directly
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('datasets')
      .upload(filePath, file, {
        upsert: true,
        cacheControl: '3600',
        contentType
      });
      
    if (uploadError) {
      console.error('Direct upload error:', uploadError);
      
      // Try fallback approach with direct policy update
      console.log("Trying to update storage policies before retrying...");
      
      // Call the storage-manager function to update policies
      const { data: managerData, error: managerError } = await supabase.functions.invoke('storage-manager', {
        method: 'POST',
        body: { 
          action: 'check-permissions',
          bucket: 'datasets'
        }
      });
      
      if (managerError) {
        console.warn("Permission check failed:", managerError);
      } else {
        console.log("Storage policies verified");
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
    }
    
    // If first attempt succeeded
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
