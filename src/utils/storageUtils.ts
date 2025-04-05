
import { supabase } from '@/lib/supabase';

/**
 * Verifies if all required storage buckets exist
 * @returns Promise resolving to a boolean indicating if all buckets exist
 */
export const verifyStorageBuckets = async (): Promise<boolean> => {
  try {
    // Get existing buckets first
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error("Failed to list buckets:", listError);
      return false;
    }
    
    const existingBucketNames = existingBuckets?.map(b => b.name) || [];
    const requiredBuckets = ['datasets', 'secure', 'cold_storage'];
    
    console.log("Existing buckets:", existingBucketNames);
    
    // Check if all required buckets exist
    const allBucketsExist = requiredBuckets.every(b => existingBucketNames.includes(b));
    
    if (!allBucketsExist) {
      console.log("Missing buckets:", requiredBuckets.filter(b => !existingBucketNames.includes(b)));
    }
    
    return allBucketsExist;
  } catch (error) {
    console.error("Error verifying storage buckets:", error);
    return false;
  }
};

/**
 * Creates the required storage buckets if they don't exist
 * @returns Promise resolving to a boolean indicating if all buckets were created successfully
 */
export const createStorageBuckets = async (): Promise<boolean> => {
  try {
    console.log("Creating storage buckets directly via API");
    
    // Required buckets
    const requiredBuckets = ['datasets', 'secure', 'cold_storage'];
    const results = [];
    
    // Get current session for auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error("No active session when creating storage buckets");
      return false;
    }
    
    // Get existing buckets first
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.error("Failed to list buckets:", listError);
      return false;
    }
    
    const existingBucketNames = existingBuckets?.map(b => b.name) || [];
    console.log("Existing buckets:", existingBucketNames);
    
    // Create each required bucket if it doesn't exist
    for (const bucketName of requiredBuckets) {
      if (!existingBucketNames.includes(bucketName)) {
        console.log(`Creating bucket: ${bucketName}`);
        const { data, error } = await supabase.storage.createBucket(bucketName, {
          public: false,
          fileSizeLimit: 50 * 1024 * 1024 // 50MB limit
        });
        
        if (error) {
          console.error(`Failed to create bucket ${bucketName}:`, error);
          results.push({ bucket: bucketName, success: false, error: error.message });
        } else {
          console.log(`Successfully created bucket: ${bucketName}`);
          results.push({ bucket: bucketName, success: true });
        }
      } else {
        console.log(`Bucket ${bucketName} already exists`);
        results.push({ bucket: bucketName, success: true, existing: true });
      }
    }
    
    // Verify buckets now exist
    return await verifyStorageBuckets();
  } catch (error) {
    console.error("Error creating storage buckets:", error);
    return false;
  }
};

/**
 * Calls the storage-manager edge function for various operations
 * @param operation The operation to perform
 * @returns Promise resolving to the result of the operation
 */
export const callStorageManager = async (operation: string) => {
  try {
    // Construct the URL for the edge function
    const supabaseUrl = 'https://rehadpogugijylybwmoe.supabase.co';
    const functionUrl = `${supabaseUrl}/functions/v1/storage-manager/${operation}`;
    console.log(`Calling storage manager: ${functionUrl}`);
    
    // Get the current session for auth
    const { data: { session } } = await supabase.auth.getSession();
    
    // Call the edge function with authorization
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || ''}`
      },
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Storage manager ${operation} failed:`, errorText);
      return { success: false, error: errorText };
    }
    
    const result = await response.json();
    console.log(`Storage manager ${operation} result:`, result);
    return result;
  } catch (error) {
    console.error(`Error calling storage manager ${operation}:`, error);
    return { success: false, error: String(error) };
  }
};

/**
 * Attempts to create storage buckets using multiple methods, with fallbacks
 * @returns Promise resolving to a boolean indicating if buckets were created successfully
 */
export const setupStorageBuckets = async () => {
  console.log("Setting up storage buckets...");
  
  // First try direct API method
  const bucketsCreated = await createStorageBuckets();
  
  if (bucketsCreated) {
    return { success: true, message: "Buckets successfully created via API" };
  }
  
  // If direct method fails, try the edge function
  return await callStorageManager('force-create-buckets');
};

/**
 * Tests permission by uploading a small test file
 * @param userId User ID to test permissions with
 * @returns Promise resolving to a boolean indicating if permission test passed
 */
export const testBucketPermission = async (userId: string): Promise<boolean> => {
  try {
    const testBlob = new Blob(["test"], { type: "text/plain" });
    const testFile = new File([testBlob], "test-permission.txt");
    
    const { data: permissionTest, error: permissionError } = await supabase.storage
      .from('datasets')
      .upload(`${userId}/test-permission.txt`, testFile);
    
    if (permissionError) {
      console.error("Storage permission test failed:", permissionError);
      return false;
    }
    
    console.log("Storage permission test passed");
    await supabase.storage.from('datasets').remove([`${userId}/test-permission.txt`]);
    return true;
  } catch (permTestErr) {
    console.error("Permission test failed:", permTestErr);
    return false;
  }
};
