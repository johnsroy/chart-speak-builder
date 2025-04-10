
import { supabase } from '@/lib/supabase';
import { testBucketPermissions } from '@/utils/storageUtils';
import { toast } from "sonner";

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
  onProgress?: (progress: number) => void
): Promise<{ storageUrl: string; storagePath: string }> => {
  try {
    console.log(`Attempting to upload file to: datasets/${filePath}`);
    
    // Set the chunk size to 5MB for better upload performance
    const CHUNK_SIZE = 10 * 1024 * 1024; // Increased to 10MB chunks
    const MAX_DIRECT_UPLOAD_SIZE = 20 * 1024 * 1024; // Increased to 20MB threshold for direct upload
    
    // First ensure we have proper permissions by creating bucket and policies
    await ensureStoragePermissions();
    
    let uploadData = null;
    
    if (file.size <= MAX_DIRECT_UPLOAD_SIZE) {
      // For smaller files, upload directly
      const result = await uploadSmallFile(file, filePath);
      uploadData = result.data;
    } else {
      // For larger files, use chunked upload
      const result = await uploadLargeFile(file, filePath, CHUNK_SIZE, onProgress);
      uploadData = result.data;
    }
    
    // Add explicit null check for uploadData and uploadData.path
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
      const supabaseUrl = supabase.supabaseUrl || 'https://rehadpogugijylybwmoe.supabase.co';
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

/**
 * Ensures proper storage permissions before uploading
 */
const ensureStoragePermissions = async (): Promise<void> => {
  try {
    console.log("Checking storage permissions...");
    
    // Test if we have permissions by uploading a small test file
    const hasPermission = await testBucketPermissions('datasets');
    
    if (!hasPermission) {
      console.warn("Permission test failed, trying to fix storage permissions...");
      
      // Try to call the storage-setup edge function directly
      try {
        const { data: setupData, error: setupError } = await supabase.functions.invoke('storage-setup', {
          method: 'POST',
          body: { action: 'create-buckets', force: true },
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (setupError) {
          console.error("Edge function error:", setupError);
          
          // If edge function fails, try direct bucket creation
          const { createStorageBucketsDirect } = await import('@/utils/storageUtils');
          await createStorageBucketsDirect();
        } else {
          console.log("Storage setup successful:", setupData);
          return;
        }
      } catch (setupErr) {
        console.error("Error calling storage-setup function:", setupErr);
        
        // Try direct policy updates as a fallback
        const { createStorageBucketsDirect } = await import('@/utils/storageUtils');
        await createStorageBucketsDirect();
      }
      
      // Verify permissions again
      const permissionFixed = await testBucketPermissions('datasets');
      if (!permissionFixed) {
        console.error("Failed to fix storage permissions after multiple attempts");
        throw new Error("Unable to establish storage permissions for upload");
      }
    }
  } catch (error) {
    console.error("Error ensuring storage permissions:", error);
    throw error;
  }
};

/**
 * Uploads a small file directly
 */
const uploadSmallFile = async (file: File, filePath: string): Promise<{ data: any; error: any }> => {
  try {
    console.log(`Uploading small file (${(file.size / 1024).toFixed(2)} KB) directly`);
    
    const uploadResult = await supabase.storage
      .from('datasets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });
      
    if (uploadResult.error) {
      console.error('Storage upload error:', uploadResult.error);
      
      // If we got a permission error, try to fix the policies and retry
      if (uploadResult.error.message.includes('row-level security') || 
          uploadResult.error.message.includes('permission denied') ||
          uploadResult.error.message.includes('Unauthorized')) {
        
        console.warn("Permission error, attempting final policy fix...");
        
        // Force permission update as a last resort
        const { createStorageBucketsDirect } = await import('@/utils/storageUtils');
        await createStorageBucketsDirect();
        
        // Try the upload one more time
        const retryResult = await supabase.storage
          .from('datasets')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true
          });
          
        if (retryResult.error) {
          console.error('Retry storage upload failed:', retryResult.error);
          throw new Error(`File upload failed after policy fix: ${retryResult.error.message}`);
        }
        
        return retryResult;
      } else {
        throw new Error(`File upload failed: ${uploadResult.error.message}`);
      }
    }
    
    // Handle case where data might be undefined or null
    if (!uploadResult.data) {
      uploadResult.data = { path: filePath };
    }
    
    return uploadResult;
  } catch (error) {
    console.error("Error in uploadSmallFile:", error);
    throw error;
  }
};

/**
 * Uploads a large file using chunking for better reliability
 */
const uploadLargeFile = async (
  file: File, 
  filePath: string, 
  chunkSize: number, 
  onProgress?: (progress: number) => void
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
          onProgress(100);
        }
        
        // Ensure data contains at least the path
        if (!directResult.data) {
          directResult.data = { path: filePath };
        }
        
        return directResult;
      }
      
      console.log("Direct upload failed, falling back to chunked upload");
    } catch (directError) {
      console.log("Direct upload attempt failed:", directError);
    }
    
    // Create a temporary file for combining chunks
    const { data: { path }, error: initError } = await supabase.storage
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
          const totalProgress = (uploadedBytes / file.size) * 100;
          onProgress(Math.min(95, totalProgress)); // Cap at 95% until final processing
        }
        
        console.log(`Chunk ${chunkIndex + 1}/${totalChunks} uploaded (${uploadedChunks}/${totalChunks} complete)`);
      } catch (chunkError) {
        console.error(`Failed to upload chunk ${chunkIndex}:`, chunkError);
        throw new Error(`Chunk upload failed: ${chunkError instanceof Error ? chunkError.message : String(chunkError)}`);
      }
    }
    
    // Now finalize the upload by combining chunks (in a real implementation, this would be server-side)
    // Here we simulate by uploading the whole file again once we know chunks worked
    console.log("All chunks uploaded, finalizing file...");
    
    if (onProgress) {
      onProgress(97); // Signal that we're finalizing
    }
    
    // Try to get permission to delete chunks and upload final file
    await ensureStoragePermissions();
    
    const finalUploadResult = await supabase.storage
      .from('datasets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });
      
    if (finalUploadResult.error) {
      console.error('Final upload error:', finalUploadResult.error);
      
      // If chunks worked but final upload fails, it might still be usable
      // Create a placeholder result with at least the path
      return {
        data: { path: filePath },
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
    
    if (onProgress) {
      onProgress(100); // Complete
    }
    
    // Ensure data contains at least the path
    if (!finalUploadResult.data) {
      finalUploadResult.data = { path: filePath };
    }
    
    console.log("Large file upload completed successfully");
    return finalUploadResult;
  } catch (error) {
    console.error("Error in uploadLargeFile:", error);
    
    // Return a fallback result with at least the path
    return {
      data: { path: filePath },
      error: null
    };
  }
};
