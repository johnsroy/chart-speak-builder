
import { supabase } from '@/lib/supabase';

/**
 * Ensures storage buckets exist before uploading
 */
export const ensureStorageBuckets = async (): Promise<void> => {
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
