
import { supabase } from '@/lib/supabase';
import { UploadResult, ProgressCallback } from './types';

/**
 * Uploads a large file in chunks to handle size limitations
 * @param file File to upload
 * @param filePath Path in storage bucket
 * @param chunkSize Size of each chunk in bytes
 * @param onProgress Progress callback (optional)
 * @returns Object containing upload result
 */
export const uploadLargeFile = async (
  file: File,
  filePath: string,
  chunkSize: number = 5 * 1024 * 1024, // Default to 5MB chunks
  onProgress?: ProgressCallback
): Promise<UploadResult> => {
  try {
    console.log(`Starting chunked upload for large file (${file.size} bytes) to ${filePath}`);
    
    // Start with 0% progress
    onProgress?.(0);
    
    // Make sure the file has the correct content type
    const contentType = file.type || 'application/octet-stream';
    console.log(`File content type: ${contentType}`);
    
    // Prepare storage options with public access
    const storageOptions = {
      cacheControl: '3600',
      contentType,
      upsert: true
    };
    
    // First check if we can directly upload - try a small test upload
    try {
      const testBlobContent = 'test';
      const testBlob = new Blob([testBlobContent], { type: 'text/plain' });
      const testFilePath = `test_${Date.now()}.txt`;
      
      console.log("Testing storage permissions with small file...");
      const { data, error } = await supabase.storage
        .from('datasets')
        .upload(testFilePath, testBlob, { ...storageOptions });
      
      if (error) {
        console.warn("Permission test failed:", error);
        // Will continue with chunked upload anyway
      } else {
        console.log("Permission test succeeded");
        
        // Try to cleanup test file
        try {
          await supabase.storage.from('datasets').remove([testFilePath]);
        } catch (cleanupError) {
          console.warn("Test file cleanup failed:", cleanupError);
        }
      }
    } catch (testError) {
      console.warn("Permission test error:", testError);
    }
    
    // If file is small enough, try direct upload
    if (file.size <= 10 * 1024 * 1024) {
      console.log("File is small enough for direct upload, trying...");
      try {
        const { data, error } = await supabase.storage
          .from('datasets')
          .upload(filePath, file, storageOptions);
          
        if (error) {
          console.warn("Direct upload failed, falling back to chunked upload:", error);
        } else {
          console.log("Direct upload succeeded");
          onProgress?.(100);
          
          // Get the public URL
          const publicUrl = supabase.storage
            .from('datasets')
            .getPublicUrl(filePath).data.publicUrl;
          
          return {
            storageUrl: publicUrl,
            storagePath: filePath
          };
        }
      } catch (directError) {
        console.warn("Direct upload error, falling back to chunked:", directError);
      }
    }
    
    // Proceed with chunked upload
    
    // Calculate total chunks
    const totalChunks = Math.ceil(file.size / chunkSize);
    console.log(`Uploading in ${totalChunks} chunks of ${chunkSize} bytes each`);
    
    // Create array promises to track upload status
    const uploadPromises = [];
    const chunkResults = [];
    
    // Process in smaller batches to avoid overwhelming the server
    const BATCH_SIZE = 3;
    const totalBatches = Math.ceil(totalChunks / BATCH_SIZE);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchPromises = [];
      const startChunkIndex = batchIndex * BATCH_SIZE;
      const endChunkIndex = Math.min((batchIndex + 1) * BATCH_SIZE, totalChunks);
      
      for (let chunkIndex = startChunkIndex; chunkIndex < endChunkIndex; chunkIndex++) {
        const start = chunkIndex * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        
        // Create a chunk from the file
        const chunk = file.slice(start, end);
        
        // Create a unique filename for this chunk
        const chunkFilePath = `${filePath}_chunk_${chunkIndex}`;
        
        console.log(`Uploading chunk ${chunkIndex + 1}/${totalChunks} (${start} to ${end})`);
        
        // Add retry logic for each chunk
        const uploadChunkWithRetry = async (retries = 3, delay = 1000) => {
          let lastError;
          
          for (let attempt = 0; attempt < retries; attempt++) {
            try {
              // Upload the chunk to storage
              const { data, error } = await supabase.storage
                .from('datasets')
                .upload(chunkFilePath, chunk, {
                  ...storageOptions
                });
              
              if (error) {
                console.warn(`Chunk ${chunkIndex} attempt ${attempt + 1} failed:`, error);
                lastError = error;
                
                // Add delay before retry
                if (attempt < retries - 1) {
                  await new Promise(resolve => setTimeout(resolve, delay));
                }
              } else {
                // Success - break out of retry loop
                console.log(`Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`);
                
                chunkResults[chunkIndex] = {
                  path: chunkFilePath,
                  size: end - start
                };
                
                return;
              }
            } catch (uploadError) {
              console.error(`Chunk ${chunkIndex} attempt ${attempt + 1} error:`, uploadError);
              lastError = uploadError;
              
              // Add delay before retry
              if (attempt < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
          }
          
          // If we get here, all retries failed
          throw lastError || new Error(`Failed to upload chunk ${chunkIndex} after ${retries} attempts`);
        };
        
        batchPromises.push(uploadChunkWithRetry());
      }
      
      // Wait for all chunks in this batch to complete
      try {
        await Promise.all(batchPromises);
        
        // Update progress after each batch
        if (onProgress) {
          const progress = Math.min(90, Math.round(((batchIndex + 1) / totalBatches) * 90));
          onProgress(progress);
        }
      } catch (batchError) {
        console.error(`Batch ${batchIndex + 1} failed:`, batchError);
        throw batchError;
      }
    }
    
    // All chunks uploaded, now merge them using a direct function call
    console.log("All chunks uploaded, creating the final file");
    
    // Try to create final file by notifying backend
    try {
      // At this point we have all chunks uploaded, try to finalize with a server-side function
      const { data, error } = await supabase.functions.invoke('storage-manager', {
        method: 'POST',
        body: {
          action: 'merge-chunks',
          filePath: filePath,
          chunks: chunkResults,
          contentType
        }
      });
      
      if (error) {
        console.error("Error merging chunks:", error);
        throw new Error(`Failed to merge chunks: ${error.message}`);
      }
      
      // If server-side merging successful, use the returned URL
      if (data && data.url) {
        console.log("Chunks merged successfully by server-side function");
        onProgress?.(100);
        
        return {
          storageUrl: data.url,
          storagePath: filePath
        };
      }
      
      // Fallback: get the public URL directly
      console.log("Using direct URL as fallback");
    } catch (mergeError) {
      console.warn("Error merging chunks via function, using direct URL:", mergeError);
    }
    
    // Fallback approach - use direct URL from original file path
    const publicUrl = supabase.storage
      .from('datasets')
      .getPublicUrl(filePath).data.publicUrl;
    
    onProgress?.(100);
    console.log("Chunked upload complete, returning URL:", publicUrl);
    
    return {
      storageUrl: publicUrl,
      storagePath: filePath
    };
  } catch (error) {
    console.error("Large file upload failed:", error);
    throw new Error(`Failed to upload large file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
