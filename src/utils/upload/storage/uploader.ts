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
    
    // Set the chunk size to 100MB for better upload performance with large files
    const CHUNK_SIZE = 100 * 1024 * 1024; // 100MB chunks
    const MAX_DIRECT_UPLOAD_SIZE = 100 * 1024 * 1024; // 100MB threshold for direct upload
    
    // First ensure we have proper permissions by creating bucket and policies
    await ensureStorageBuckets();
    
    let uploadData = null;
    let progressValue = 0;
    
    // Set up last progress check to detect rollbacks
    let lastProgressValue = 0;
    let progressRollbacks = 0;
    
    // Setup interval to keep UI updated even if progress stalls
    const progressInterval = setInterval(() => {
      if (onProgress && progressValue < 95) {
        // Very small increment to show activity during stalls
        progressValue += 0.1;
        onProgress(progressValue);
      }
    }, 1000);
    
    try {
      // Custom progress tracking that prevents rollbacks
      const trackProgress = (progress: number) => {
        // Only update if progress is increasing
        if (progress > progressValue) {
          progressValue = progress;
          
          if (onProgress) {
            onProgress(progressValue);
          }
        } else if (progress < lastProgressValue) {
          // Log if progress is rolling back but don't update the UI
          console.warn(`Progress rollback detected: ${lastProgressValue} -> ${progress}`);
          progressRollbacks++;
        }
        
        lastProgressValue = progress;
      };
      
      if (file.size <= MAX_DIRECT_UPLOAD_SIZE) {
        // For smaller files, upload directly
        const result = await uploadSmallFile(file, filePath, trackProgress);
        uploadData = result.data;
      } else {
        // For larger files, use chunked upload
        const result = await uploadLargeFile(file, filePath, CHUNK_SIZE, trackProgress);
        uploadData = result.data;
      }
    } finally {
      // Always clear interval
      clearInterval(progressInterval);
    }
    
    // Add explicit null check for uploadData
    if (!uploadData) {
      console.error('Upload returned null data');
      throw new Error('Upload succeeded but returned no data');
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
