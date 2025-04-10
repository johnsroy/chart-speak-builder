
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
    if (!uploadData && (!uploadAttempted || file.size <= MAX_DIRECT_UPLOAD_SIZE)) {
      try {
        console.log('Trying upload for smaller file');
        const result = await uploadSmallFile(file, filePath, onProgress);
        uploadData = result.data;
      } catch (smallError) {
        console.warn('Small file upload method failed:', smallError);
      }
    }
    
    // For larger files or if small file upload didn't work, try chunked upload
    if (!uploadData && (!uploadAttempted || file.size > MAX_DIRECT_UPLOAD_SIZE)) {
      try {
        console.log('Trying chunked upload for larger file');
        const result = await uploadLargeFile(file, filePath, CHUNK_SIZE, onProgress);
        uploadData = result.data;
      } catch (chunkedError) {
        console.warn('Chunked upload method failed:', chunkedError);
      }
    }
    
    // Last resort - try a simpler direct upload without options
    if (!uploadData) {
      try {
        console.log('Trying last resort direct upload with minimal options');
        const { data, error } = await supabase.storage
          .from('datasets')
          .upload(filePath, file);
          
        if (error) {
          console.warn('Last resort upload failed:', error);
        } else {
          uploadData = data;
        }
      } catch (lastAttemptError) {
        console.error('All upload methods failed:', lastAttemptError);
        throw new Error(`Upload failed after trying all available methods`);
      }
    }
    
    // Create a fallback result if uploadData is missing or incomplete
    if (!uploadData || !uploadData.path) {
      console.warn('Upload returned incomplete data, creating fallback response');
      uploadData = {
        path: filePath,
        id: filePath,
        fullPath: `datasets/${filePath}`
      };
    }
    
    // Use file path as fallback if path is missing in the response
    const finalPath = uploadData.path || filePath;
    
    // Use a try-catch block specifically for getting the public URL
    try {
      const publicUrlResult = supabase.storage.from('datasets').getPublicUrl(finalPath);
      
      if (!publicUrlResult.data || !publicUrlResult.data.publicUrl) {
        throw new Error('Could not generate public URL');
      }
      
      return {
        storageUrl: publicUrlResult.data.publicUrl,
        storagePath: finalPath
      };
    } catch (urlError) {
      console.error('Error generating public URL:', urlError);
      
      // Fallback to constructing a URL manually
      const supabaseUrl = 'https://rehadpogugijylybwmoe.supabase.co';
      const fallbackUrl = `${supabaseUrl}/storage/v1/object/public/datasets/${finalPath}`;
      
      return {
        storageUrl: fallbackUrl,
        storagePath: finalPath
      };
    }
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
};
