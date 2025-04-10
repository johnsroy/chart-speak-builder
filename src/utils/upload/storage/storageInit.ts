
import { supabase } from '@/lib/supabase';

/**
 * Ensures storage buckets exist before uploading
 */
export const ensureStorageBuckets = async (): Promise<void> => {
  try {
    console.log("Checking storage permissions...");
    
    // First try to verify if buckets exist
    const { data: buckets, error } = await supabase.storage.listBuckets();
    const requiredBuckets = ['datasets', 'secure', 'cold_storage'];
    const existingBuckets = buckets?.map(b => b.name) || [];
    
    const missingBuckets = requiredBuckets.filter(name => !existingBuckets.includes(name));
    
    if (missingBuckets.length === 0) {
      console.log("All required buckets already exist");
      
      // Still test permissions to ensure we can upload
      const hasPermission = await testBucketPermissions('datasets');
      
      if (hasPermission) {
        console.log("Storage permissions verified");
        return;
      }
      
      console.warn("Permission test failed despite buckets existing, attempting to fix policies...");
    } else {
      console.log(`Missing buckets: ${missingBuckets.join(', ')}`);
    }
    
    // Try multiple approaches to create buckets and fix permissions
    const approaches = [
      { name: "Edge function", fn: callStorageSetupFunction },
      { name: "Direct bucket creation", fn: createBucketsDirect },
      { name: "Direct policy update", fn: updatePoliciesDirect }
    ];
    
    for (const approach of approaches) {
      try {
        console.log(`Trying ${approach.name} approach...`);
        const success = await approach.fn();
        
        if (success) {
          console.log(`${approach.name} approach succeeded`);
          
          // Test permissions after successful approach
          const hasPermission = await testBucketPermissions('datasets');
          
          if (hasPermission) {
            console.log("Storage permissions verified after fix");
            return;
          }
          
          console.warn(`${approach.name} reported success but permission test failed, trying next approach`);
        } else {
          console.warn(`${approach.name} approach failed, trying next approach`);
        }
      } catch (approachError) {
        console.error(`Error with ${approach.name} approach:`, approachError);
      }
    }
    
    // Final attempt: create bucket directly without fancy options
    try {
      for (const bucketName of requiredBuckets) {
        if (!existingBuckets.includes(bucketName)) {
          console.log(`Last resort: creating bucket ${bucketName} directly...`);
          
          try {
            await supabase.storage.createBucket(bucketName);
            console.log(`Successfully created bucket ${bucketName}`);
          } catch (createError) {
            console.error(`Failed to create bucket ${bucketName}:`, createError);
          }
        }
      }
      
      // Test one more time
      const finalTest = await testBucketPermissions('datasets');
      
      if (finalTest) {
        console.log("Storage permissions verified after final attempt");
        return;
      }
    } catch (lastError) {
      console.error("Final bucket creation attempt failed:", lastError);
    }
    
    console.error("All approaches to fix storage permissions failed");
    throw new Error("Unable to establish storage permissions for upload");
  } catch (error) {
    console.error("Error ensuring storage permissions:", error);
    throw error;
  }
};

/**
 * Calls the storage-setup edge function
 */
const callStorageSetupFunction = async (): Promise<boolean> => {
  try {
    console.log("Calling storage-setup edge function...");
    
    // First try direct fetch to edge function
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token || '';
      
      const response = await fetch('https://rehadpogugijylybwmoe.supabase.co/functions/v1/storage-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'create-buckets', force: true })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Edge function direct fetch succeeded:", data);
        return data?.success || false;
      }
      
      console.error("Edge function HTTP error:", response.status, response.statusText);
    } catch (fetchError) {
      console.error("Error with direct fetch:", fetchError);
    }
    
    // Fallback to functions.invoke
    const { data, error } = await supabase.functions.invoke('storage-setup', {
      method: 'POST',
      body: { action: 'create-buckets', force: true }
    });
    
    if (error) {
      console.error("Error calling storage-setup function:", error);
      return false;
    }
    
    return data?.success || false;
  } catch (error) {
    console.error("Error in callStorageSetupFunction:", error);
    return false;
  }
};

/**
 * Creates buckets directly using the Storage API
 */
const createBucketsDirect = async (): Promise<boolean> => {
  try {
    console.log("Creating buckets directly...");
    const requiredBuckets = ['datasets', 'secure', 'cold_storage'];
    let success = false;
    
    for (const bucketName of requiredBuckets) {
      try {
        console.log(`Creating bucket ${bucketName}...`);
        
        const { error } = await supabase.storage.createBucket(bucketName, {
          public: true
        });
        
        if (error) {
          if (error.message.includes('already exists')) {
            console.log(`Bucket ${bucketName} already exists`);
            success = true;
          } else {
            console.error(`Error creating bucket ${bucketName}:`, error);
          }
        } else {
          console.log(`Successfully created bucket ${bucketName}`);
          success = true;
        }
      } catch (bucketError) {
        console.error(`Error creating bucket ${bucketName}:`, bucketError);
      }
    }
    
    return success;
  } catch (error) {
    console.error("Error in createBucketsDirect:", error);
    return false;
  }
};

/**
 * Updates storage policies directly
 */
const updatePoliciesDirect = async (): Promise<boolean> => {
  try {
    console.log("Updating storage policies directly...");
    
    try {
      const { data, error } = await supabase.rpc('create_public_storage_policies', {
        bucket_name: 'datasets'
      });
      
      if (error) {
        console.error("Error updating policies:", error);
        return false;
      }
      
      console.log("Successfully updated policies");
      return true;
    } catch (rpcError) {
      console.error("Error calling RPC function:", rpcError);
      
      // Try a more direct approach
      try {
        await supabase.rpc('execute_sql', {
          sql_command: `
            CREATE POLICY "Public Access datasets"
            ON storage.objects
            FOR ALL
            USING (bucket_id = 'datasets')
            WITH CHECK (bucket_id = 'datasets');
          `
        });
        
        console.log("Created direct policy with SQL");
        return true;
      } catch (sqlError) {
        console.error("Error with direct SQL:", sqlError);
        return false;
      }
    }
  } catch (error) {
    console.error("Error in updatePoliciesDirect:", error);
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
