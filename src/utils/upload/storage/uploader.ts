
import { supabase } from '@/lib/supabase';
import { UploadResult, ProgressCallback } from './types';
import { ensureStorageBuckets } from './storageInit';
import { uploadSmallFile } from './directUploader';
import { uploadLargeFile } from './chunkedUploader';

/**
 * Uploads a file to storage with chunking for large files
 * @param file File to upload
 * @param filePath Path in storage bucket
 * @param onProgress Progress callback (optional)
 * @returns Object containing storage URL and storage path
 */
export const uploadFileToStorage = async (
  file: File,
  filePath: string,
  onProgress?: ProgressCallback
): Promise<UploadResult> => {
  try {
    console.log(`Attempting to upload file to: datasets/${filePath}`);
    
    // Set the chunk size to 50MB for better upload performance with large files
    const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks
    const MAX_DIRECT_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB threshold for direct upload
    
    // First ensure we have proper permissions by creating bucket and policies
    try {
      await ensureStorageBuckets();
    } catch (initError) {
      console.warn("Storage initialization had issues but continuing with upload:", initError);
      // Continue anyway as the bucket might still exist
    }
    
    let uploadData = null;
    let uploadAttempted = false;
    
    // Try direct upload first for all file sizes as it's more reliable
    try {
      console.log('Trying direct upload first regardless of file size');
      uploadAttempted = true;
      
      const { data, error } = await supabase.storage
        .from('datasets')
        .upload(filePath, file, { 
          upsert: true,
          cacheControl: '3600'
        });
        
      if (error) {
        console.warn('Direct upload had an issue, will try other methods:', error);
      } else {
        console.log('Direct upload succeeded');
        uploadData = data;
      }
    } catch (directError) {
      console.warn('Direct upload failed, will try other methods:', directError);
    }
    
    // If direct upload didn't work or didn't return data, try the more complex methods
    if (!uploadData) {
      if (file.size <= MAX_DIRECT_UPLOAD_SIZE) {
        // For smaller files, try a different direct upload method
        uploadData = await uploadSmallFile(file, filePath, onProgress);
      } else {
        // For larger files, use chunked upload
        uploadData = await uploadLargeFile(file, filePath, CHUNK_SIZE, onProgress);
      }
    }
    
    // Construct the public URL
    const publicUrl = supabase.storage
      .from('datasets')
      .getPublicUrl(filePath).data.publicUrl;
    
    return {
      storageUrl: publicUrl,
      storagePath: filePath
    };
  } catch (error) {
    console.error('File upload failed:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
