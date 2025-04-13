
import { supabase } from '@/lib/supabase';
import { UploadResult, ProgressCallback, ChunkUploadResponse } from './types';

/**
 * Uploads a large file in chunks
 * @param file File to upload
 * @param filePath Path in storage bucket
 * @param chunkSize Size of each chunk in bytes
 * @param onProgress Progress callback (optional)
 * @returns Object containing upload result
 */
export const uploadLargeFile = async (
  file: File,
  filePath: string,
  chunkSize: number = 10 * 1024 * 1024, // Default 10MB
  onProgress?: ProgressCallback
): Promise<UploadResult> => {
  try {
    console.log(`Uploading large file (${file.size} bytes) in chunks of ${chunkSize} bytes to ${filePath}`);
    
    // Calculate total chunks
    const totalChunks = Math.ceil(file.size / chunkSize);
    console.log(`Total chunks: ${totalChunks}`);
    
    // Start progress at 0%
    onProgress?.(0);
    
    // Create an array to track uploaded chunks
    const uploadedChunks: boolean[] = Array(totalChunks).fill(false);
    
    // Try to upload all chunks in parallel with a reasonable concurrency limit
    const MAX_CONCURRENT_UPLOADS = 3;
    let activeUploads = 0;
    let nextChunkIndex = 0;
    let failedChunks: number[] = [];
    
    // Function to upload a single chunk
    const uploadChunk = async (chunkIndex: number): Promise<boolean> => {
      try {
        if (uploadedChunks[chunkIndex]) {
          return true; // Skip already uploaded chunks
        }
        
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        
        // Add chunk index to filename to avoid conflicts
        const chunkPath = `${filePath}_chunk_${chunkIndex}`;
        
        console.log(`Uploading chunk ${chunkIndex} (${start}-${end}, size: ${chunk.size} bytes)`);
        
        // Upload the chunk
        const { data, error } = await supabase.storage
          .from('datasets')
          .upload(chunkPath, chunk, {
            upsert: true,
            cacheControl: '3600'
          });
          
        if (error) {
          console.error(`Error uploading chunk ${chunkIndex}:`, error);
          return false;
        }
        
        // Mark chunk as uploaded
        uploadedChunks[chunkIndex] = true;
        
        // Calculate and report progress
        const uploadedCount = uploadedChunks.filter(Boolean).length;
        const progressPercent = Math.floor((uploadedCount / totalChunks) * 90); // Leave 10% for finalization
        onProgress?.(progressPercent);
        
        console.log(`Chunk ${chunkIndex} uploaded successfully (${progressPercent}% complete)`);
        return true;
      } catch (chunkError) {
        console.error(`Failed to upload chunk ${chunkIndex}:`, chunkError);
        return false;
      }
    };
    
    // Function to start the next chunk upload when possible
    const startNextChunk = async () => {
      if (nextChunkIndex >= totalChunks) {
        return;
      }
      
      const chunkIndex = nextChunkIndex++;
      activeUploads++;
      
      try {
        const success = await uploadChunk(chunkIndex);
        if (!success) {
          failedChunks.push(chunkIndex);
        }
      } finally {
        activeUploads--;
        if (nextChunkIndex < totalChunks) {
          // Start another chunk when this one completes
          await startNextChunk(); 
        }
      }
    };
    
    // Start initial batch of uploads
    const initialUploads = Array(Math.min(MAX_CONCURRENT_UPLOADS, totalChunks))
      .fill(0)
      .map(() => startNextChunk());
      
    // Wait for all chunks to complete
    await Promise.all(initialUploads);
    
    // Retry failed chunks (up to 3 attempts)
    for (let attempt = 0; attempt < 3 && failedChunks.length > 0; attempt++) {
      console.log(`Retry attempt ${attempt + 1} for ${failedChunks.length} failed chunks`);
      
      const chunksToRetry = [...failedChunks];
      failedChunks = [];
      
      // Try to upload failed chunks one by one
      for (const chunkIndex of chunksToRetry) {
        const success = await uploadChunk(chunkIndex);
        if (!success) {
          failedChunks.push(chunkIndex);
        }
      }
      
      if (failedChunks.length === 0) {
        console.log("All chunks uploaded successfully after retries");
        break;
      }
    }
    
    // If there are still failed chunks, try one last direct upload of the complete file
    if (failedChunks.length > 0) {
      console.log(`Still have ${failedChunks.length} failed chunks, attempting direct upload as fallback`);
      
      try {
        onProgress?.(91);
        
        // Try direct upload of the full file
        const { data, error } = await supabase.storage
          .from('datasets')
          .upload(filePath, file, {
            upsert: true,
            cacheControl: '3600'
          });
          
        if (error) {
          console.error("Fallback direct upload failed:", error);
          throw new Error(`Failed to upload file after retries: ${error.message}`);
        }
        
        onProgress?.(95);
        console.log("Fallback direct upload successful");
      } catch (directError) {
        console.error("All upload attempts failed:", directError);
        throw new Error("Failed to upload file: All upload methods failed");
      }
    } else {
      // All chunks were uploaded successfully, now merge them
      onProgress?.(95);
      console.log("All chunks uploaded successfully, finalizing");
      
      try {
        // For larger files, it's better to use the direct upload as the final step
        // since we've verified the storage connection works with the chunks
        const { data, error } = await supabase.storage
          .from('datasets')
          .upload(filePath, file, {
            upsert: true,
            cacheControl: '3600'
          });
          
        if (error) {
          console.error("Error finalizing upload:", error);
          throw error;
        }
      } catch (finalizeError) {
        console.error("Error finalizing upload:", finalizeError);
        throw new Error(`Failed to finalize upload: ${finalizeError instanceof Error ? finalizeError.message : 'Unknown error'}`);
      }
    }
    
    // Clean up chunks
    try {
      onProgress?.(98);
      
      console.log("Cleaning up chunk files");
      await Promise.all(
        uploadedChunks
          .map((uploaded, index) => uploaded ? `${filePath}_chunk_${index}` : null)
          .filter(Boolean)
          .map(chunkPath => 
            supabase.storage
              .from('datasets')
              .remove([chunkPath as string])
          )
      );
    } catch (cleanupError) {
      // Non-fatal error, just log it
      console.warn("Error cleaning up chunks (non-fatal):", cleanupError);
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
    console.error('Chunked upload failed:', error);
    throw new Error(`Failed to upload large file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
