
import { supabase } from '@/lib/supabase';

/**
 * Uploads a file to storage
 * @param file File to upload
 * @param filePath Path in storage bucket
 * @param onProgress Progress callback (optional)
 * @returns Object containing storage URL and storage path
 */
export const uploadFileToStorage = async (
  file: File,
  filePath: string,
  onProgress?: (progress: number) => void
): Promise<{ storageUrl: string; storagePath: string }> => {
  try {
    console.log(`Attempting to upload file to: datasets/${filePath}`);
    
    // First, check if we need to create a chunked upload
    if (file.size > 5 * 1024 * 1024) { // 5MB chunk size
      return await uploadLargeFile(file, filePath, onProgress);
    }
    
    // For smaller files, upload directly
    const { data, error } = await supabase.storage
      .from('datasets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // Use upsert to overwrite if exists
      });
      
    if (error) {
      console.error('Storage upload error:', error);
      throw new Error(`File upload failed: ${error.message}`);
    }
    
    if (!data || !data.path) {
      throw new Error('Upload succeeded but no path returned');
    }
    
    const storageUrl = supabase.storage.from('datasets').getPublicUrl(filePath).data.publicUrl;
    
    return {
      storageUrl,
      storagePath: filePath
    };
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
};

/**
 * Uploads a large file in chunks
 * @param file Large file to upload
 * @param filePath Path in storage bucket
 * @param onProgress Progress callback (optional)
 * @returns Object containing storage URL and storage path
 */
async function uploadLargeFile(
  file: File,
  filePath: string,
  onProgress?: (progress: number) => void
): Promise<{ storageUrl: string; storagePath: string }> {
  // Generate a temporary chunk path
  const chunkSize = 5 * 1024 * 1024; // 5MB
  const totalChunks = Math.ceil(file.size / chunkSize);
  const chunkPaths = [];
  
  try {
    // Upload each chunk
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const chunk = file.slice(start, end);
      const chunkPath = `${filePath}_chunk_${i}`;
      
      console.log(`Uploading chunk ${i + 1}/${totalChunks} (${start}-${end} bytes)`);
      
      // Create a File object from the chunk to specify content type
      const chunkFile = new File([chunk], `chunk_${i}`, { type: file.type });
      
      const { data, error } = await supabase.storage
        .from('datasets')
        .upload(chunkPath, chunkFile, { 
          upsert: true, 
          contentType: file.type
        });
        
      if (error) {
        console.error(`Error uploading chunk ${i}:`, error);
        throw new Error(`Error uploading chunk ${i}: ${error.message}`);
      }
      
      chunkPaths.push(chunkPath);
      
      // Update progress
      if (onProgress) {
        const progress = Math.min(80, Math.floor((i + 1) / totalChunks * 70) + 10);
        onProgress(progress);
      }
    }
    
    // For large files, we'll need to implement an edge function to combine the chunks
    // For now, we'll use the first chunk as a reference
    const storageUrl = supabase.storage.from('datasets').getPublicUrl(chunkPaths[0]).data.publicUrl;
    
    return {
      storageUrl,
      storagePath: chunkPaths[0] // Using first chunk as path for now
    };
  } catch (error) {
    // Clean up partial upload chunks on error
    console.error("Error during chunked upload:", error);
    
    // Attempt to clean up chunks
    for (const chunkPath of chunkPaths) {
      try {
        await supabase.storage.from('datasets').remove([chunkPath]);
      } catch (cleanupError) {
        console.warn(`Failed to clean up chunk ${chunkPath}:`, cleanupError);
      }
    }
    
    throw error;
  }
}
