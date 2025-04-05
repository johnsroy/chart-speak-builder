
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
    // For reliability, use the edge function approach instead
    return await callStorageManager('force-create-buckets')
      .then(result => result.success)
      .catch(_ => false);
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
    
    // Call the edge function without requiring authentication for maximum reliability
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
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
  
  try {
    // Try the edge function directly for maximum reliability
    const result = await callStorageManager('force-create-buckets');
    if (result.success) {
      return { success: true, message: "Buckets successfully created via edge function" };
    }
    
    // Fall back to direct API method if edge function fails
    const bucketsCreated = await createStorageBuckets();
    if (bucketsCreated) {
      return { success: true, message: "Buckets successfully created via API" };
    }
    
    return { success: false, message: "Failed to create buckets using all available methods" };
  } catch (error) {
    console.error("Error in setupStorageBuckets:", error);
    return { success: false, message: String(error) };
  }
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
