
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
      
      // Try using the storage-manager edge function first
      try {
        console.log("Using storage-manager function to create bucket");
        const { data, error } = await supabase.functions.invoke('storage-manager', {
          method: 'POST',
          body: { action: 'create-bucket', bucketName: 'datasets' }
        });
        
        if (error || !data?.success) {
          console.warn("Edge function bucket creation had issues:", error || data);
          // Continue to try other methods
        } else {
          console.log("Storage bucket created via edge function");
          return; // If edge function indicates success, we're done
        }
      } catch (edgeFunctionError) {
        console.warn("Edge function approach had issues:", edgeFunctionError);
      }
      
      // If edge function approach didn't work, try direct bucket creation
      try {
        console.log("Trying direct bucket creation");
        const { error: createError } = await supabase.storage.createBucket('datasets', {
          public: true // Ensure bucket is public
        });
        
        if (createError) {
          console.warn("Direct bucket creation failed:", createError);
          throw createError;
        }
        
        console.log("'datasets' bucket created successfully via direct API");
      } catch (directCreateError) {
        console.warn("Direct bucket creation failed:", directCreateError);
        
        // Try using the storage-setup edge function as last resort
        try {
          console.log("Attempting to create bucket via storage-setup edge function");
          const { data, error: functionError } = await supabase.functions.invoke('storage-setup', {
            method: 'POST',
            body: { action: 'create-buckets', force: true },
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
    
    // Execute a direct SQL command to create proper policies using Postgres RPC
    try {
      console.log("Setting up storage policies via SQL");
      
      // Using RPC to execute the SQL with elevated privileges
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_string: `
          DO $$
          BEGIN
            -- Allow anon and authenticated users to use the datasets bucket
            IF NOT EXISTS (
              SELECT 1 FROM storage.policies 
              WHERE name = 'allow_public_access_datasets'
            ) THEN
              INSERT INTO storage.policies (name, definition, owner)
              VALUES (
                'allow_public_access_datasets',
                '(bucket_id = ''datasets''::text)',
                'authenticated'
              );
            END IF;
          END $$;
        `
      });
      
      if (error) {
        console.warn("Policy setup had warning:", error);
      } else {
        console.log("Storage policies updated via SQL");
      }
    } catch (sqlError) {
      console.warn("SQL policy update had issues (non-fatal):", sqlError);
      
      // Try to update policies using the edge function as fallback
      try {
        await supabase.functions.invoke('storage-setup', {
          method: 'POST',
          body: { action: 'update-policies' },
          headers: {
            'Content-Type': 'application/json'
          }
        });
        console.log("Storage policies updated via edge function");
      } catch (policyError) {
        console.warn("Error updating storage policies (non-fatal):", policyError);
      }
    }
  } catch (error) {
    console.error("Error ensuring buckets:", error);
    throw error;
  }
};
