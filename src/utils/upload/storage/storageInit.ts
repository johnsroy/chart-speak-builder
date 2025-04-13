
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
      
      try {
        // First try using edge function
        const { data, error: functionError } = await supabase.functions.invoke('storage-setup', {
          method: 'POST',
          body: { action: 'create-buckets' },
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (functionError) {
          console.warn("Edge function approach failed:", functionError);
          throw functionError;
        }
        
        if (data?.success) {
          console.log("Storage buckets created via edge function");
          
          // Verify buckets were created
          const { data: updatedBuckets, error: verifyError } = await supabase.storage.listBuckets();
          if (verifyError) {
            console.warn("Error verifying bucket creation:", verifyError);
          } else {
            const nowExists = updatedBuckets?.some(bucket => bucket.name === 'datasets');
            if (!nowExists) {
              console.warn("Bucket still doesn't exist after edge function call, will try direct creation");
              throw new Error("Edge function didn't create the bucket");
            }
          }
          
          return;
        }
      } catch (edgeFunctionError) {
        console.warn("Edge function approach failed:", edgeFunctionError);
      }
      
      // Fallback to direct bucket creation
      try {
        const { error: createError } = await supabase.storage.createBucket('datasets', {
          public: true,
          fileSizeLimit: 10 * 1024 * 1024 * 1024, // 10GB limit
          allowedMimeTypes: ['text/csv', 'application/json', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
        });
        
        if (createError) {
          console.error("Error creating 'datasets' bucket:", createError);
          throw createError;
        }
        
        console.log("'datasets' bucket created successfully");
      } catch (directCreateError) {
        console.error("Direct bucket creation failed:", directCreateError);
        throw directCreateError;
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
    } catch (policyError) {
      console.warn("Error updating storage policies (non-fatal):", policyError);
    }
  } catch (error) {
    console.error("Error ensuring buckets:", error);
    throw error;
  }
};
