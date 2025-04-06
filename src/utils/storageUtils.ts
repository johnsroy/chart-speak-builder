
import { supabase } from '@/lib/supabase';
import { toast } from "sonner";

/**
 * Verifies that all required storage buckets exist
 * @returns A promise resolving to true if all buckets exist, false otherwise
 */
export const verifyStorageBuckets = async (): Promise<boolean> => {
  try {
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
 * Creates required storage buckets directly using the Supabase API
 * @returns A promise resolving to true if all buckets were created, false otherwise
 */
export const createStorageBuckets = async (): Promise<boolean> => {
  try {
    const requiredBuckets = ['datasets', 'secure', 'cold_storage'];
    const existingBuckets = await getBucketNames();
    const results = [];
    
    for (const bucketName of requiredBuckets) {
      if (!existingBuckets.includes(bucketName)) {
        try {
          const { error } = await supabase.storage.createBucket(bucketName, {
            public: true
          });
          
          results.push({
            bucketName,
            success: !error,
            error: error?.message
          });
          
          if (error) {
            console.error(`Error creating bucket ${bucketName}:`, error.message);
          } else {
            console.log(`Successfully created bucket: ${bucketName}`);
          }
        } catch (bucketError) {
          console.error(`Exception creating bucket ${bucketName}:`, bucketError);
          results.push({
            bucketName,
            success: false,
            error: bucketError.message
          });
        }
      } else {
        results.push({
          bucketName,
          success: true,
          message: "Bucket already exists"
        });
      }
    }
    
    return results.every(result => result.success);
  } catch (error) {
    console.error("Error creating buckets:", error);
    return false;
  }
};

/**
 * Gets the names of all existing buckets
 * @returns Array of bucket names
 */
const getBucketNames = async (): Promise<string[]> => {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error("Error listing buckets:", error.message);
      return [];
    }
    
    return buckets?.map(bucket => bucket.name) || [];
  } catch (error) {
    console.error("Error getting bucket names:", error);
    return [];
  }
};

/**
 * Sets up storage buckets
 */
export const setupStorageBuckets = async () => {
  try {
    console.log("Setting up storage buckets...");
    
    // Try to use the edge function first
    const result = await callStorageManager('setup');
    
    if (result.success) {
      return result;
    }
    
    // Fall back to direct API approach
    const success = await createStorageBuckets();
    
    return {
      success,
      message: success ? "Storage buckets created via API" : "Failed to create storage buckets"
    };
  } catch (error) {
    console.error("Failed to set up storage buckets:", error);
    return {
      success: false,
      message: `Error: ${error.message}`
    };
  }
};

/**
 * Tests if a bucket has write permission by attempting to upload a test file
 * @param bucketName Name of the bucket to test
 * @returns Promise resolving to true if write permission exists
 */
export const testBucketPermission = async (bucketName: string): Promise<boolean> => {
  try {
    // Create a small test file
    const testContent = new Uint8Array([1, 2, 3, 4]);
    const testPath = `test-${Date.now()}.bin`;
    
    // Try to upload
    const { error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(testPath, testContent);
      
    if (uploadError) {
      console.error(`No write permission for bucket ${bucketName}:`, uploadError);
      return false;
    }
    
    // Clean up
    await supabase.storage.from(bucketName).remove([testPath]);
    
    return true;
  } catch (error) {
    console.error(`Error testing bucket ${bucketName} permissions:`, error);
    return false;
  }
};

/**
 * Calls the storage-manager edge function
 * @param action The action to call
 * @returns Promise resolving to the function result
 */
export const callStorageManager = async (action: string): Promise<any> => {
  try {
    console.log(`Calling storage manager: ${supabase.functions.url}/${action}`);
    
    const { data, error } = await supabase.functions.invoke('storage-manager', {
      body: { action },
    });
    
    if (error) {
      console.error(`Storage manager ${action} failed:`, error);
      return { success: false, message: error.message };
    }
    
    return data;
  } catch (error) {
    console.error(`Storage manager ${action} failed:`, error);
    return { success: false, message: error.message };
  }
};
