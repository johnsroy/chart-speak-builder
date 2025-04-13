
import { supabase } from '@/lib/supabase';

/**
 * Ensures all required storage buckets exist
 */
export const ensureStorageBuckets = async (): Promise<void> => {
  try {
    console.log("Ensuring storage buckets exist");
    
    // Check if 'datasets' bucket exists
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error("Error listing buckets:", error);
      throw error;
    }
    
    const datasetsBucketExists = buckets?.some(
      bucket => bucket.name === 'datasets'
    );
    
    // Create 'datasets' bucket if it doesn't exist
    if (!datasetsBucketExists) {
      console.log("Creating 'datasets' bucket");
      
      // First try using the direct bucket creation
      try {
        const { error: createError } = await supabase.storage.createBucket('datasets', {
          public: true,
          fileSizeLimit: 10 * 1024 * 1024 * 1024, // 10GB limit
          allowedMimeTypes: ['text/csv', 'application/json', 'application/vnd.ms-excel', 
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream']
        });
        
        if (createError) {
          console.warn("Direct bucket creation failed, will try edge function:", createError);
          throw createError;
        }
        
        console.log("'datasets' bucket created successfully via direct API");
      } catch (directCreateError) {
        // Try using edge function
        try {
          console.log("Attempting to create bucket via edge function");
          const { data, error: functionError } = await supabase.functions.invoke('storage-setup', {
            method: 'POST',
            body: { action: 'create-buckets' },
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (functionError) {
            console.error("Edge function approach failed:", functionError);
            throw functionError;
          }
          
          console.log("Storage buckets created via edge function");
        } catch (edgeFunctionError) {
          console.error("All bucket creation methods failed:", edgeFunctionError);
          throw new Error("Could not create storage buckets: " + 
            (edgeFunctionError instanceof Error ? edgeFunctionError.message : 'Unknown error'));
        }
      }
      
      // Verify buckets were created
      const { data: updatedBuckets, error: verifyError } = await supabase.storage.listBuckets();
      if (verifyError) {
        console.warn("Error verifying bucket creation:", verifyError);
      } else {
        const nowExists = updatedBuckets?.some(bucket => bucket.name === 'datasets');
        if (!nowExists) {
          console.error("Bucket still doesn't exist after creation attempts");
          throw new Error("Failed to create storage bucket");
        } else {
          console.log("Verified 'datasets' bucket now exists");
        }
      }
    } else {
      console.log("'datasets' bucket already exists");
    }
    
    // Check and update bucket policies to ensure files are accessible
    try {
      await supabase.functions.invoke('storage-setup', {
        method: 'POST',
        body: { action: 'update-policies' },
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log("Storage policies updated");
    } catch (policyError) {
      console.warn("Error updating storage policies (non-fatal):", policyError);
    }
  } catch (error) {
    console.error("Error ensuring buckets:", error);
    throw error;
  }
};
