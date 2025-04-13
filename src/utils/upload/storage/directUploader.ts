
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
    
    // Upload the file
    const { data, error } = await supabase.storage
      .from('datasets')
      .upload(filePath, file, {
        upsert: true,
        cacheControl: '3600'
      });
      
    if (error) {
      throw error;
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
