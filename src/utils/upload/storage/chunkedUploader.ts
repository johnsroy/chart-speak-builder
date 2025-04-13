
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
    
    // Function to upload a single chunk
    const uploadChunk = async (chunkIndex: number): Promise<void> => {
      try {
        if (uploadedChunks[chunkIndex]) {
          return; // Skip already uploaded chunks
        }
        
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        
        // Add chunk index to filename to avoid conflicts
        const chunkPath = `${filePath}_chunk_${chunkIndex}`;
        
        // Upload the chunk
        const { data, error } = await supabase.storage
          .from('datasets')
          .upload(chunkPath, chunk, {
            upsert: true,
            cacheControl: '3600'
          });
          
        if (error) {
          console.error(`Error uploading chunk ${chunkIndex}:`, error);
          throw error;
        }
        
        // Mark chunk as uploaded
        uploadedChunks[chunkIndex] = true;
        
        // Calculate and report progress
        const uploadedCount = uploadedChunks.filter(Boolean).length;
        const progressPercent = Math.floor((uploadedCount / totalChunks) * 90); // Leave 10% for finalization
        onProgress?.(progressPercent);
        
        console.log(`Chunk ${chunkIndex} uploaded successfully (${progressPercent}% complete)`);
      } catch (chunkError) {
        console.error(`Failed to upload chunk ${chunkIndex}:`, chunkError);
        throw chunkError;
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
        await uploadChunk(chunkIndex);
      } catch (error) {
        console.error(`Chunk ${chunkIndex} upload failed, retrying:`, error);
        // Retry once
        try {
          await uploadChunk(chunkIndex);
        } catch (retryError) {
          console.error(`Retry for chunk ${chunkIndex} failed:`, retryError);
          throw retryError;
        }
      } finally {
        activeUploads--;
        await startNextChunk(); // Start another chunk when this one completes
      }
    };
    
    // Start initial batch of uploads
    const initialUploads = Array(Math.min(MAX_CONCURRENT_UPLOADS, totalChunks))
      .fill(0)
      .map(() => startNextChunk());
      
    // Wait for all chunks to complete
    await Promise.all(initialUploads);
    
    // Ensure all chunks were uploaded
    if (!uploadedChunks.every(Boolean)) {
      throw new Error('Not all chunks were uploaded successfully');
    }
    
    // Report progress for finalization phase
    onProgress?.(95);
    
    // Merge chunks and create final file
    // In a real implementation, we might use a server-side function to merge the chunks
    // For now, we'll use a direct upload of the full file since we have all the chunks
    const { data, error } = await supabase.storage
      .from('datasets')
      .upload(filePath, file, {
        upsert: true,
        cacheControl: '3600'
      });
      
    if (error) {
      throw error;
    }
    
    // Clean up chunks
    await Promise.all(
      uploadedChunks.map((_, index) => 
        supabase.storage
          .from('datasets')
          .remove([`${filePath}_chunk_${index}`])
      )
    );
    
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
