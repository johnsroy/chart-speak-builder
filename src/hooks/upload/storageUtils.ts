
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

/**
 * Verifies that all required storage buckets exist
 * @returns A promise resolving to true if all buckets exist, false otherwise
 */
export const verifyStorageBucket = async (): Promise<boolean> => {
  try {
    console.log("Verifying storage buckets exist...");
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error("Error listing buckets:", error.message);
      return false;
    }
    
    const requiredBuckets = ['datasets', 'secure', 'cold_storage'];
    const existingBuckets = buckets?.map(bucket => bucket.name) || [];
    
    console.log("Existing buckets:", existingBuckets);
    
    const missingBuckets = requiredBuckets.filter(
      bucketName => !existingBuckets.includes(bucketName)
    );
    
    console.log("Missing buckets:", missingBuckets);
    
    return missingBuckets.length === 0;
  } catch (error) {
    console.error("Error verifying buckets:", error);
    return false;
  }
};

/**
 * Creates required storage buckets using the storage-setup edge function
 * @returns A promise resolving to true if all buckets were created, false otherwise
 */
export const createStorageBucketIfNeeded = async (): Promise<boolean> => {
  try {
    console.log("Creating storage buckets using edge function...");
    
    // Call the storage-setup edge function
    const { data, error } = await supabase.functions.invoke('storage-setup', {
      method: 'POST',
      body: { action: 'create-buckets' },
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (error) {
      console.error("Error calling storage-setup function:", error);
      toast.error("Failed to initialize storage", {
        description: error.message || "Could not create storage buckets"
      });
      return false;
    }
    
    if (!data?.success) {
      console.warn("Storage setup function did not report success:", data);
      
      // Try direct bucket creation as a fallback
      const { createStorageBucketsDirect } = await import('@/utils/storageUtils');
      const directSuccess = await createStorageBucketsDirect();
      
      if (directSuccess) {
        toast.success("Storage initialized successfully (direct method)", {
          description: "The application is ready to handle file uploads"
        });
        return true;
      }
      
      return false;
    }
    
    console.log("Storage buckets created:", data);
    toast.success("Storage initialized successfully", {
      description: "The application is ready to handle file uploads"
    });
    
    // Double check that buckets now exist
    const bucketsExist = await verifyStorageBucket();
    return bucketsExist;
  } catch (error) {
    console.error("Error creating storage buckets:", error);
    toast.error("Storage initialization failed", {
      description: error instanceof Error ? error.message : "Unknown error"
    });
    return false;
  }
};
