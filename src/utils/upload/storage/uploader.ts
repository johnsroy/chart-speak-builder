
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
    
    // Reduced chunk size for better reliability
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
    const MAX_DIRECT_UPLOAD_SIZE = 30 * 1024 * 1024; // 30MB threshold for direct upload
    
    // First ensure we have proper permissions by creating bucket and policies
    try {
      await ensureStorageBuckets();
    } catch (initError) {
      console.warn("Storage initialization had issues but continuing with upload:", initError);
      // Continue anyway as the bucket might still exist
    }
    
    let uploadData: UploadResult | null = null;
    let uploadAttempted = false;
    let uploadError: any = null;
    
    // Verify the content type
    const contentType = file.type || 
      (filePath.toLowerCase().endsWith('.csv') ? 'text/csv' : 
       filePath.toLowerCase().endsWith('.json') ? 'application/json' : 
       'application/octet-stream');
    
    console.log(`File content type: ${contentType}`);
    
    // For files smaller than the threshold, try direct upload first
    if (file.size <= MAX_DIRECT_UPLOAD_SIZE) {
      try {
        console.log('Trying direct upload for small file');
        uploadAttempted = true;
        
        uploadData = await uploadSmallFile(file, filePath, onProgress);
        console.log('Direct upload succeeded');
        
        // If we succeeded, return immediately
        return uploadData;
      } catch (directError) {
        console.warn('Direct upload failed for small file:', directError);
        uploadError = directError;
      }
    } else {
      // For large files, use chunked upload immediately
      console.log('Using chunked upload for large file');
      
      try {
        uploadAttempted = true;
        uploadData = await uploadLargeFile(file, filePath, CHUNK_SIZE, onProgress);
        console.log('Chunked upload succeeded');
        
        // If chunked upload succeeded, return immediately
        return uploadData;
      } catch (chunkedError) {
        console.warn('Chunked upload failed:', chunkedError);
        uploadError = chunkedError;
      }
    }
    
    // If both methods failed, try a simple fallback approach
    if (!uploadData) {
      try {
        console.log('Trying fallback direct upload as last resort');
        uploadAttempted = true;
        
        // First make sure the bucket exists again
        await ensureStorageBuckets();
        
        // Try direct Supabase upload with explicit content type
        const { data, error } = await supabase.storage
          .from('datasets')
          .upload(filePath, file, { 
            upsert: true,
            cacheControl: '3600',
            contentType
          });
          
        if (error) {
          console.error('Fallback direct upload failed:', error);
          throw error;
        }
        
        console.log('Fallback direct upload succeeded');
        
        // Construct the public URL
        const publicUrl = supabase.storage
          .from('datasets')
          .getPublicUrl(filePath).data.publicUrl;
        
        uploadData = {
          storageUrl: publicUrl,
          storagePath: filePath
        };
      } catch (fallbackError) {
        console.error('All upload methods failed:', fallbackError);
        
        // If we have an error from a previous attempt, throw that instead
        // as it's likely more informative
        if (uploadError) {
          throw uploadError;
        }
        
        throw fallbackError;
      }
    }
    
    if (!uploadData) {
      throw new Error('Upload failed: No upload data returned from any method');
    }
    
    // Ensure we hit 100% progress
    onProgress?.(100);
    
    return uploadData;
  } catch (error) {
    console.error('File upload failed:', error);
    
    // Ensure we hit 0% progress to indicate failure
    onProgress?.(0);
    
    // Improve error messages
    const errorMessage = error instanceof Error 
      ? error.message 
      : (typeof error === 'object' && error !== null)
        ? JSON.stringify(error)
        : 'Unknown error';
    
    throw new Error(`Failed to upload file: ${errorMessage}`);
  }
};
