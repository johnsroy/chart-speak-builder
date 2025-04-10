
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
    await ensureStorageBuckets();
    
    let uploadData = null;
    
    try {
      if (file.size <= MAX_DIRECT_UPLOAD_SIZE) {
        // For smaller files, upload directly
        const result = await uploadSmallFile(file, filePath, onProgress);
        uploadData = result.data;
      } else {
        // For larger files, use chunked upload
        const result = await uploadLargeFile(file, filePath, CHUNK_SIZE, onProgress);
        uploadData = result.data;
      }
    } catch (uploadError) {
      console.error('File upload error:', uploadError);
      
      // Try direct upload as fallback regardless of file size
      try {
        console.log('Trying direct upload as fallback');
        const { data, error } = await supabase.storage
          .from('datasets')
          .upload(filePath, file, { upsert: true });
          
        if (error) {
          throw new Error(`Direct upload fallback failed: ${error.message}`);
        }
        
        uploadData = data;
      } catch (directError) {
        console.error('Direct upload fallback failed:', directError);
        throw new Error(`Upload failed: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`);
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
