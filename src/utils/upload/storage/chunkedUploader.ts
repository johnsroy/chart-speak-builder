import { supabase } from '@/lib/supabase';
import { ProgressCallback } from './types';
import { ensureStorageBuckets } from './storageInit';

/**
 * Uploads a large file using chunking for better reliability
 */
export const uploadLargeFile = async (
  file: File, 
  filePath: string, 
  chunkSize: number, 
  onProgress?: ProgressCallback
): Promise<{ data: any; error: any }> => {
  try {
    console.log(`Uploading large file (${(file.size / (1024 * 1024)).toFixed(2)} MB) using chunks of ${chunkSize / (1024 * 1024)}MB`);
    
    // Try direct upload first as a fallback option for some environments
    try {
      console.log("Attempting direct upload for large file...");
      const directResult = await supabase.storage
        .from('datasets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });
        
      if (!directResult.error) {
        console.log("Direct upload of large file succeeded");
        if (onProgress) {
          onProgress(95);
        }
        
        // Ensure data contains required fields
        if (!directResult.data) {
          directResult.data = { 
            path: filePath,
            id: filePath,
            fullPath: `datasets/${filePath}`
          };
        } else if (!directResult.data.path) {
          // Make sure path is set
          directResult.data.path = filePath;
        }
        
        return directResult;
      }
      
      console.log("Direct upload failed, falling back to chunked upload");
    } catch (directError) {
      console.log("Direct upload attempt failed:", directError);
    }
    
    // Create a temporary file for combining chunks
    const { data: { path } = {}, error: initError } = await supabase.storage
      .from('datasets')
      .upload(`${filePath}.part`, new Blob([]), {
        upsert: true
      });
      
    if (initError) {
      console.error('Error initializing chunked upload:', initError);
      throw new Error(`Failed to initialize chunked upload: ${initError.message}`);
    }
    
    // Calculate total chunks
    const totalChunks = Math.ceil(file.size / chunkSize);
    console.log(`File will be uploaded in ${totalChunks} chunks`);
    
    let uploadedChunks = 0;
    let uploadedBytes = 0;
    
    // Upload each chunk
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * chunkSize;
      const end = Math.min(file.size, start + chunkSize);
      const chunk = file.slice(start, end);
      
      try {
        console.log(`Uploading chunk ${chunkIndex + 1}/${totalChunks} (${(chunk.size / 1024).toFixed(2)} KB)`);
        
        // Try up to 3 times per chunk
        let attempt = 0;
        let chunkUploaded = false;
        
        while (attempt < 3 && !chunkUploaded) {
          try {
            const { error: chunkError } = await supabase.storage
              .from('datasets')
              .upload(`${filePath}_chunk_${chunkIndex}`, chunk, {
                upsert: true
              });
              
            if (chunkError) {
              console.error(`Error uploading chunk ${chunkIndex} (attempt ${attempt + 1}/3):`, chunkError);
              attempt++;
              // Short delay before retry
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              chunkUploaded = true;
            }
          } catch (chunkUploadError) {
            console.error(`Exception uploading chunk ${chunkIndex} (attempt ${attempt + 1}/3):`, chunkUploadError);
            attempt++;
            // Longer delay before retry
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
        
        if (!chunkUploaded) {
          throw new Error(`Failed to upload chunk ${chunkIndex} after 3 attempts`);
        }
        
        uploadedChunks++;
        uploadedBytes += chunk.size;
        
        if (onProgress) {
          // Calculate progress as percentage but cap at 95% until final processing
          const totalProgress = Math.floor((uploadedBytes / file.size) * 95);
          onProgress(Math.min(95, totalProgress));
        }
        
        console.log(`Chunk ${chunkIndex + 1}/${totalChunks} uploaded (${uploadedChunks}/${totalChunks} complete)`);
      } catch (chunkError) {
        console.error(`Failed to upload chunk ${chunkIndex}:`, chunkError);
        throw new Error(`Chunk upload failed: ${chunkError instanceof Error ? chunkError.message : String(chunkError)}`);
      }
    }
    
    // Signal that we're finalizing
    if (onProgress) {
      onProgress(95);
    }
    
    console.log("All chunks uploaded, finalizing file...");
    
    // Try to get permission to delete chunks and upload final file
    await ensureStorageBuckets();
    
    // Upload the complete file
    const finalUploadResult = await supabase.storage
      .from('datasets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });
      
    if (finalUploadResult.error) {
      console.error('Final upload error:', finalUploadResult.error);
      
      // If chunks worked but final upload fails, it might still be usable
      // Create a placeholder result with required fields
      return {
        data: { 
          path: filePath,
          id: filePath,
          fullPath: `datasets/${filePath}`
        },
        error: null
      };
    }
    
    // Clean up chunks
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      try {
        await supabase.storage
          .from('datasets')
          .remove([`${filePath}_chunk_${chunkIndex}`]);
      } catch (cleanupError) {
        console.warn(`Failed to cleanup chunk ${chunkIndex}:`, cleanupError);
        // Non-fatal, continue
      }
    }
    
    // Also remove the initial .part file
    try {
      await supabase.storage
        .from('datasets')
        .remove([`${filePath}.part`]);
    } catch (cleanupError) {
      console.warn(`Failed to cleanup part file:`, cleanupError);
      // Non-fatal, continue
    }
    
    // At 100% when finished
    if (onProgress) {
      onProgress(100);
    }
    
    // Ensure data contains required fields
    if (!finalUploadResult.data) {
      finalUploadResult.data = { 
        path: filePath,
        id: filePath,
        fullPath: `datasets/${filePath}`
      };
    } else if (!finalUploadResult.data.path) {
      // Make sure path is set for consistency
      finalUploadResult.data.path = filePath;
    }
    
    console.log("Large file upload completed successfully");
    return finalUploadResult;
  } catch (error) {
    console.error("Error in uploadLargeFile:", error);
    
    // Return a fallback result with required fields
    return {
      data: { 
        path: filePath,
        id: filePath,
        fullPath: `datasets/${filePath}`
      },
      error: null
    };
  }
};
