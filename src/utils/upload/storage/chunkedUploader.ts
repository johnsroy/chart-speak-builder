
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
  chunkSize: number = 5 * 1024 * 1024, // Default 5MB (reduced from 10MB)
  onProgress?: ProgressCallback
): Promise<UploadResult> => {
  try {
    console.log(`Uploading large file (${file.size} bytes) in chunks of ${chunkSize} bytes to ${filePath}`);
    
    // Calculate total chunks
    const totalChunks = Math.ceil(file.size / chunkSize);
    console.log(`Total chunks: ${totalChunks}`);
    
    // Start progress at 0%
    onProgress?.(0);
    
    // Try direct upload first for files that aren't extremely large
    if (file.size < 100 * 1024 * 1024) { // 100MB threshold
      try {
        console.log('Attempting direct upload for moderately-sized file');
        const contentType = file.type || 'application/octet-stream';
        
        const { data, error } = await supabase.storage
          .from('datasets')
          .upload(filePath, file, {
            upsert: true,
            cacheControl: '3600',
            contentType
          });
          
        if (!error) {
          console.log('Direct upload succeeded');
          onProgress?.(100);
          
          // Get the public URL
          const publicUrl = supabase.storage
            .from('datasets')
            .getPublicUrl(filePath).data.publicUrl;
          
          return {
            storageUrl: publicUrl,
            storagePath: filePath
          };
        } else {
          console.warn('Direct upload failed, falling back to chunked upload:', error);
        }
      } catch (directError) {
        console.warn('Direct upload failed, falling back to chunked upload:', directError);
      }
    }
    
    // Create an array to track uploaded chunks
    const uploadedChunks: boolean[] = Array(totalChunks).fill(false);
    let failedChunks: number[] = [];
    
    // Set a more reasonable concurrency limit
    const MAX_CONCURRENT_UPLOADS = 2;
    let activeUploads = 0;
    let nextChunkIndex = 0;
    
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
        
        console.log(`Uploading chunk ${chunkIndex + 1}/${totalChunks} (${start}-${end}, size: ${chunk.size} bytes)`);
        
        // Force the correct content type for the chunk
        const chunkType = file.type || 'application/octet-stream';
        
        // Upload the chunk with explicit content type
        const { data, error } = await supabase.storage
          .from('datasets')
          .upload(chunkPath, chunk, {
            upsert: true,
            cacheControl: '3600',
            contentType: chunkType
          });
          
        if (error) {
          console.error(`Error uploading chunk ${chunkIndex + 1}/${totalChunks}:`, error);
          return false;
        }
        
        // Mark chunk as uploaded
        uploadedChunks[chunkIndex] = true;
        
        // Calculate and report progress
        const uploadedCount = uploadedChunks.filter(Boolean).length;
        const progressPercent = Math.floor((uploadedCount / totalChunks) * 90); // Leave 10% for finalization
        onProgress?.(progressPercent);
        
        console.log(`Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully (${progressPercent}% complete)`);
        return true;
      } catch (chunkError) {
        console.error(`Failed to upload chunk ${chunkIndex + 1}/${totalChunks}:`, chunkError);
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
    
    // Wait until all active uploads are done
    while (activeUploads > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
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
    
    // Handle the case of still having failed chunks
    if (failedChunks.length > 0) {
      console.warn(`${failedChunks.length} chunks still failed after retries`);
      
      // If only a few chunks failed out of many, we can try to proceed
      if (failedChunks.length <= Math.max(3, Math.floor(totalChunks * 0.05))) {
        console.log("Only a small number of chunks failed, attempting to proceed with merge");
      } else {
        console.error(`Too many chunks (${failedChunks.length}/${totalChunks}) failed, aborting`);
        throw new Error(`Failed to upload file: ${failedChunks.length} chunks could not be uploaded after retries`);
      }
    }
    
    // Finalize the upload - combine chunks or upload complete file directly
    onProgress?.(95);
    console.log("Finalizing upload");
    
    try {
      if (file.size <= 50 * 1024 * 1024) {
        // For smaller files, it's better to just upload the whole file
        console.log("Using direct upload as final step");
        
        const contentType = file.type || 'application/octet-stream';
        const { data, error } = await supabase.storage
          .from('datasets')
          .upload(filePath, file, {
            upsert: true,
            cacheControl: '3600',
            contentType
          });
          
        if (error) {
          throw error;
        }
      } else {
        // For larger files, we need to use an edge function to combine chunks
        // But since we don't have that functionality yet, try direct upload with explicit content type
        console.log("Trying direct upload for final file");
        
        const contentType = file.type || 'application/octet-stream';
        const { data, error } = await supabase.storage
          .from('datasets')
          .upload(filePath, file, {
            upsert: true,
            cacheControl: '3600',
            contentType
          });
          
        if (error) {
          console.error("Error finalizing upload:", error);
          throw error;
        }
      }
    } catch (finalizeError) {
      console.error("Error finalizing upload:", finalizeError);
      
      // Last ditch effort: try uploading in a different format
      try {
        console.log("Trying one last approach for upload");
        
        // For CSV files, try text/csv explicitly
        let specialContentType = file.type;
        if (filePath.toLowerCase().endsWith('.csv')) {
          specialContentType = 'text/csv';
        } else if (filePath.toLowerCase().endsWith('.json')) {
          specialContentType = 'application/json';
        }
        
        const { data, error } = await supabase.storage
          .from('datasets')
          .upload(filePath, file, {
            upsert: true,
            cacheControl: '3600',
            contentType: specialContentType
          });
          
        if (error) {
          throw finalizeError; // Throw the original error if this fails too
        }
      } catch (lastAttemptError) {
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
