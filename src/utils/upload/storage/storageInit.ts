
import { supabase } from '@/lib/supabase';

/**
 * Ensures all required storage buckets exist
 */
export const ensureStorageBuckets = async (): Promise<void> => {
  try {
    console.log("Ensuring storage buckets exist");
    
    // First try the storage-manager edge function
    try {
      console.log("Using storage-manager edge function");
      
      // Create the datasets bucket
      const { data, error } = await supabase.functions.invoke('storage-manager', {
        method: 'POST',
        body: { 
          action: 'create-bucket', 
          bucketName: 'datasets',
          isPublic: true
        }
      });
      
      if (error) {
        console.warn("Edge function approach had issues:", error);
      } else {
        console.log("Storage bucket created via edge function");
        return; // Success, we're done
      }
    } catch (edgeFunctionError) {
      console.warn("Edge function approach had issues:", edgeFunctionError);
    }
    
    // Try RPC approach as a fallback
    try {
      console.log("Trying RPC approach for storage bucket");
      
      // Create the datasets bucket using RPC
      const { data, error } = await supabase.rpc('create_public_storage_policies', {
        bucket_name: 'datasets'
      });
      
      if (error) {
        console.warn("RPC approach had issues:", error);
      } else {
        console.log("Storage policies created via RPC");
        return;
      }
    } catch (rpcError) {
      console.warn("RPC approach had issues:", rpcError);
    }
    
    // As a last resort, try direct API
    try {
      console.log("Trying direct API approach for storage bucket");
      
      // Check if bucket exists first
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.warn("Could not list buckets:", listError);
      } else {
        const bucketExists = buckets.some(bucket => bucket.name === 'datasets');
        
        if (!bucketExists) {
          console.log("Datasets bucket doesn't exist, creating it");
          const { error: createError } = await supabase.storage.createBucket('datasets', {
            public: true
          });
          
          if (createError) {
            console.warn("Could not create bucket:", createError);
          } else {
            console.log("Datasets bucket created via direct API");
          }
        } else {
          console.log("Datasets bucket already exists");
        }
      }
    } catch (directError) {
      console.warn("Direct API approach had issues:", directError);
    }
  } catch (error) {
    console.error("Error in ensureStorageBuckets:", error);
    // Don't throw, let the calling code continue
  }
};
