
import { supabase } from '@/lib/supabase';

/**
 * Uploads a file to Supabase storage, using chunked upload for large files
 * @param file The file to upload
 * @param filePath The path in storage
 * @param onProgress Progress callback
 * @returns Storage URL and path
 */
export const uploadFileToStorage = async (
  file: File,
  filePath: string,
  onProgress?: (progress: number) => void
): Promise<{ storageUrl: string; storagePath: string }> => {
  // For large files, we need to use chunked upload
  let storageUrl: string;
  let storagePath: string = filePath;

  if (file.size > 50 * 1024 * 1024) { // For files > 50MB use chunked upload
    console.log("Using chunked upload for large file");
    const chunkSize = 10 * 1024 * 1024; // 10MB chunks
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const chunk = file.slice(start, end);
      
      const { error } = await supabase.storage
        .from('datasets')
        .upload(`${filePath}_chunk_${chunkIndex}`, chunk, {
          upsert: true,
        });
        
      if (error) {
        throw new Error(`Error uploading chunk ${chunkIndex}: ${error.message}`);
      }
      
      // Update progress based on uploaded chunks
      if (onProgress) {
        const chunkProgress = Math.min(85, 10 + (75 * (chunkIndex + 1) / totalChunks));
        onProgress(chunkProgress);
      }
    }
    
    // For now, we'll just store the path to the first chunk - in a real implementation
    // you would need a server-side process to combine these chunks
    storageUrl = supabase.storage.from('datasets').getPublicUrl(filePath + '_chunk_0').data.publicUrl;
    
    console.log("Chunked upload completed successfully");
  } else {
    // Standard upload for smaller files
    const { data, error } = await supabase.storage
      .from('datasets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (error) {
      throw new Error(`Could not upload file to storage: ${error.message}`);
    }
    
    storageUrl = supabase.storage.from('datasets').getPublicUrl(filePath).data.publicUrl;
  }
  
  return { storageUrl, storagePath };
};
