import { supabase } from '@/lib/supabase';
import { toast } from "sonner";

/**
 * Creates storage buckets directly using the Supabase API
 * This is a fallback method if the edge function fails
 */
export const createStorageBucketsDirect = async (): Promise<boolean> => {
  try {
    console.log("Creating storage buckets directly...");
    const requiredBuckets = ['datasets', 'secure', 'cold_storage'];
    let success = false;
    
    for (const bucketName of requiredBuckets) {
      try {
        // Check if bucket exists first
        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = buckets?.some(b => b.name === bucketName) || false;
        
        if (!bucketExists) {
          console.log(`Creating bucket ${bucketName}...`);
          const { error } = await supabase.storage.createBucket(bucketName, {
            public: true // Ensure public access
          });
          
          if (error) {
            console.error(`Error creating bucket ${bucketName}:`, error);
          } else {
            console.log(`Successfully created bucket ${bucketName}`);
            success = true;
            
            // Manually insert a test file to ensure the bucket is working
            try {
              console.log(`Testing upload to ${bucketName}...`);
              const testContent = new Blob(['test'], { type: 'text/plain' });
              const testFile = new File([testContent], 'test.txt', { type: 'text/plain' });
              
              const { error: uploadError } = await supabase.storage
                .from(bucketName)
                .upload('test.txt', testFile, { upsert: true });
                
              if (uploadError) {
                console.error(`Test upload failed for ${bucketName}:`, uploadError);
              } else {
                console.log(`Test upload successful for ${bucketName}`);
              }
            } catch (testError) {
              console.error(`Error during test upload for ${bucketName}:`, testError);
            }
          }
        } else {
          console.log(`Bucket ${bucketName} already exists`);
          success = true;
        }
        
        // Call RPC functions to create policies
        try {
          console.log(`Creating storage policies for ${bucketName}...`);
          await supabase.rpc('create_storage_policy', { bucket_name: bucketName });
          console.log(`Policies created for ${bucketName}`);
        } catch (policyError) {
          console.warn(`Error creating policies for ${bucketName}:`, policyError);
          try {
            await supabase.rpc('create_public_storage_policies', { bucket_name: bucketName });
            console.log(`Fallback policies created for ${bucketName}`);
          } catch (fallbackError) {
            console.warn(`Fallback policy creation failed for ${bucketName}:`, fallbackError);
          }
        }
      } catch (bucketError) {
        console.error(`Error processing bucket ${bucketName}:`, bucketError);
      }
    }
    
    return success;
  } catch (error) {
    console.error("Error creating buckets directly:", error);
    return false;
  }
};

/**
 * Updates storage policies for all buckets directly
 * This is a utility function to fix permission issues
 */
export const updateAllStoragePolicies = async (): Promise<boolean> => {
  try {
    console.log("Updating storage policies for all buckets...");
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error("Error listing buckets:", error);
      return false;
    }
    
    let success = false;
    
    for (const bucket of buckets || []) {
      try {
        console.log(`Updating policies for ${bucket.name}...`);
        
        // Try both RPC functions
        try {
          await supabase.rpc('create_storage_policy', { bucket_name: bucket.name });
          success = true;
        } catch (error) {
          console.warn(`Primary policy creation failed for ${bucket.name}:`, error);
          try {
            await supabase.rpc('create_public_storage_policies', { bucket_name: bucket.name });
            success = true;
          } catch (fallbackError) {
            console.warn(`Fallback policy creation failed for ${bucket.name}:`, fallbackError);
          }
        }
      } catch (bucketError) {
        console.error(`Error updating policies for ${bucket.name}:`, bucketError);
      }
    }
    
    return success;
  } catch (error) {
    console.error("Error updating storage policies:", error);
    return false;
  }
};

/**
 * Direct insertion of a file to test bucket permissions
 * This is for testing if the current user has proper permissions
 */
export const testBucketPermissions = async (bucketName: string): Promise<boolean> => {
  try {
    console.log(`Testing permissions for bucket ${bucketName}...`);
    
    // Create a simple test file
    const testContent = new Blob(['test'], { type: 'text/plain' });
    const testFile = new File([testContent], 'permission_test.txt', { type: 'text/plain' });
    
    // Try to upload the file
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(`permission_test_${Date.now()}.txt`, testFile);
      
    if (error) {
      console.error(`Permission test failed for ${bucketName}:`, error);
      return false;
    }
    
    console.log(`Permission test succeeded for ${bucketName}`);
    return true;
  } catch (error) {
    console.error(`Permission test error for ${bucketName}:`, error);
    return false;
  }
};

/**
 * Formats byte size into human-readable format
 * @param bytes The size in bytes
 * @returns Formatted string (KB, MB, etc.)
 */
export const formatByteSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Gets unique datasets by filename to prevent duplicates
 * @param datasets Array of datasets
 * @returns Filtered array with unique filenames
 */
export const getUniqueDatasetsByFilename = (datasets: any[]): any[] => {
  const uniqueMap = new Map();
  datasets.forEach(dataset => {
    const filename = dataset.filename || dataset.name;
    if (!uniqueMap.has(filename) || new Date(dataset.created_at) > new Date(uniqueMap.get(filename).created_at)) {
      uniqueMap.set(filename, dataset);
    }
  });
  return Array.from(uniqueMap.values());
};

/**
 * Sets up storage buckets for the application
 * @returns Promise resolving to true if setup was successful
 */
export const setupStorageBuckets = async (): Promise<boolean> => {
  try {
    console.log("Setting up storage buckets...");
    const { data, error } = await supabase.functions.invoke('storage-setup', {
      method: 'POST',
      body: { action: 'create-buckets' }
    });
    
    if (error) {
      console.error("Error calling storage-setup function:", error);
      return false;
    }
    
    return data?.success || false;
  } catch (error) {
    console.error("Error setting up storage buckets:", error);
    return false;
  }
};

/**
 * Verifies that all required storage buckets exist
 * @returns Promise resolving to true if all buckets exist
 */
export const verifyStorageBuckets = async (): Promise<boolean> => {
  try {
    console.log("Verifying storage buckets...");
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error("Error listing buckets:", error);
      return false;
    }
    
    const requiredBuckets = ['datasets', 'secure', 'cold_storage'];
    const existingBuckets = buckets?.map(bucket => bucket.name) || [];
    
    return requiredBuckets.every(name => existingBuckets.includes(name));
  } catch (error) {
    console.error("Error verifying buckets:", error);
    return false;
  }
};

/**
 * Creates required storage buckets if they don't exist
 * @returns Promise resolving to true if buckets were created or already exist
 */
export const createStorageBuckets = async (): Promise<boolean> => {
  return await setupStorageBuckets();
};

/**
 * Calls the storage-manager edge function with a specific action
 * @param action The action to perform
 * @returns The response data or null if there was an error
 */
export const callStorageManager = async (action: string): Promise<any> => {
  try {
    const { data, error } = await supabase.functions.invoke('storage-manager', {
      method: 'POST',
      body: { action }
    });
    
    if (error) {
      console.error(`Error calling storage-manager with action ${action}:`, error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error(`Exception calling storage-manager with action ${action}:`, error);
    return null;
  }
};
