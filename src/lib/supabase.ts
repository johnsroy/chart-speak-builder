
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with correct credentials
const supabaseUrl = 'https://rehadpogugijylybwmoe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlaGFkcG9ndWdpanlseWJ3bW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4MzcyOTEsImV4cCI6MjA1OTQxMzI5MX0.jMgvzUUum46NpLp4ZKfXI06M1nIvu82L9bmAuxqYYZw';

// Create a singleton Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Helper function to directly create storage buckets via API
export const createStorageBuckets = async () => {
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
    const { data: verifyBuckets, error: verifyError } = await supabase.storage.listBuckets();
    
    if (verifyError) {
      console.error("Failed to verify buckets after creation:", verifyError);
      return false;
    }
    
    const finalBucketNames = verifyBuckets?.map(b => b.name) || [];
    const allBucketsExist = requiredBuckets.every(b => finalBucketNames.includes(b));
    
    console.log("Bucket creation complete. All buckets exist:", allBucketsExist);
    console.log("Final buckets:", finalBucketNames);
    
    return allBucketsExist;
  } catch (error) {
    console.error("Error creating storage buckets:", error);
    return false;
  }
};

// Helper function to call the storage-manager edge function
const callStorageManager = async (operation: string) => {
  try {
    // Construct the URL for the edge function
    const functionUrl = `${supabaseUrl}/functions/v1/storage-manager/${operation}`;
    console.log(`Calling storage manager: ${functionUrl}`);
    
    // Get the current session for auth
    const { data: { session } } = await supabase.auth.getSession();
    
    // Call the edge function with authorization
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || supabaseKey}`
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

// Initialize storage and admin user on app startup
const initializeApp = async () => {
  try {
    if (typeof window !== 'undefined') {
      console.log("Initializing app and creating storage buckets...");
      
      // First try direct API approach to create buckets
      const bucketsCreated = await createStorageBuckets();
      
      if (bucketsCreated) {
        console.log("Successfully created storage buckets via API");
      } else {
        console.log("Direct bucket creation failed, trying edge function...");
        
        // Try the edge function as a fallback
        const forceCreateResult = await callStorageManager('force-create-buckets');
        
        if (forceCreateResult.success) {
          console.log("Successfully created storage buckets via edge function:", forceCreateResult);
          
          // Add sample data to the buckets for testing
          const sampleResult = await callStorageManager('sample');
          if (sampleResult.success) {
            console.log("Added sample data to buckets:", sampleResult);
          } else {
            console.warn("Failed to add sample data:", sampleResult.message || "Unknown error");
          }
        } else {
          console.error("Failed to create storage buckets via edge function:", forceCreateResult.message || "Unknown error");
          
          // Try the regular setup as a final fallback
          const setupResult = await callStorageManager('setup');
          if (setupResult.success) {
            console.log("Bucket setup fallback successful:", setupResult);
          } else {
            console.error("All bucket creation methods failed");
          }
        }
      }
      
      // Initialize admin user
      try {
        const { authService } = await import('@/services/authService');
        await authService.setupAdminUser();
      } catch (authError) {
        console.error("Error setting up admin user:", authError);
      }
      
      // Check and log the current session
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Current session after setup:", session ? "Present" : "Not present");
    }
  } catch (error) {
    console.error("Failed to initialize app:", error);
  }
};

// Run initialization immediately when imported to ensure buckets are created
if (typeof window !== 'undefined') {
  // Run the function immediately
  initializeApp();
}

// Expose a function to manually trigger bucket setup
export const setupStorageBuckets = async () => {
  console.log("Manually triggering storage bucket setup...");
  // First try direct API method
  const bucketsCreated = await createStorageBuckets();
  
  if (bucketsCreated) {
    return { success: true, message: "Buckets successfully created via API" };
  }
  
  // If direct method fails, try the edge function
  return await callStorageManager('force-create-buckets');
};

// Expose a function to verify storage buckets exist
export const verifyStorageBuckets = async () => {
  try {
    // Check via the direct API first
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error("Failed to list buckets:", error);
      // Try to create the buckets if listing fails
      return await createStorageBuckets();
    }
    
    const bucketNames = buckets?.map(b => b.name) || [];
    const requiredBuckets = ['datasets', 'secure', 'cold_storage'];
    const allBucketsExist = requiredBuckets.every(b => bucketNames.includes(b));
    
    console.log("Storage bucket verification:", 
      allBucketsExist ? "All required buckets exist" : "Some buckets are missing");
    
    if (!allBucketsExist) {
      console.log("Missing buckets:", requiredBuckets.filter(b => !bucketNames.includes(b)));
      // Try to create the missing buckets
      return await createStorageBuckets();
    }
    
    return allBucketsExist;
  } catch (error) {
    console.error("Error verifying storage buckets:", error);
    return false;
  }
};
