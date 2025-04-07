
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

// Initialize app and admin user on app startup
const initializeApp = async () => {
  try {
    if (typeof window !== 'undefined') {
      console.log("Initializing app and creating storage buckets...");
      
      // Import utilities only when needed to avoid circular dependencies
      const { verifyStorageBuckets, createStorageBuckets, callStorageManager } = await import('@/utils/storageUtils');
      
      let storageSetupSuccess = false;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (!storageSetupSuccess && retryCount <= maxRetries) {
        try {
          // First try direct API approach to create buckets
          const bucketsCreated = await createStorageBuckets();
          
          if (bucketsCreated) {
            console.log("Successfully created storage buckets via API");
            storageSetupSuccess = true;
          } else {
            console.log("Direct bucket creation failed, trying edge function...");
            
            try {
              // Try the edge function
              const forceCreateResult = await callStorageManager('force-create-buckets');
              
              if (forceCreateResult && forceCreateResult.success) {
                console.log("Successfully created storage buckets via edge function:", forceCreateResult);
                storageSetupSuccess = true;
                
                // Add sample data to the buckets for testing
                try {
                  const sampleResult = await callStorageManager('sample');
                  if (sampleResult && sampleResult.success) {
                    console.log("Added sample data to buckets:", sampleResult);
                  }
                } catch (sampleError) {
                  console.warn("Failed to add sample data:", sampleError);
                }
              }
            } catch (edgeFunctionError) {
              console.error("Edge function approach failed:", edgeFunctionError);
            }
            
            if (!storageSetupSuccess) {
              // Try the regular setup as a fallback
              try {
                const setupResult = await callStorageManager('setup');
                if (setupResult && setupResult.success) {
                  console.log("Bucket setup fallback successful:", setupResult);
                  storageSetupSuccess = true;
                }
              } catch (setupError) {
                console.error("Setup fallback failed:", setupError);
              }
            }
          }
        } catch (attemptError) {
          console.error(`Storage setup attempt ${retryCount + 1} failed:`, attemptError);
        }
        
        retryCount++;
        
        if (!storageSetupSuccess && retryCount <= maxRetries) {
          // Wait before retrying
          console.log(`Retrying storage setup (${retryCount}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      if (!storageSetupSuccess) {
        console.warn("All storage setup attempts failed. Proceeding without storage initialization.");
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
  // Schedule the initialization to run after a short delay to ensure everything is ready
  setTimeout(() => {
    initializeApp();
  }, 500);
}

// Expose these functions from the imported utilities to avoid breaking existing code
export const setupStorageBuckets = async () => {
  const { setupStorageBuckets: setupBuckets } = await import('@/utils/storageUtils');
  return await setupBuckets();
};

export const verifyStorageBuckets = async () => {
  const { verifyStorageBuckets: verifyBuckets } = await import('@/utils/storageUtils');
  return await verifyBuckets();
};

export const createStorageBuckets = async () => {
  const { createStorageBuckets: createBuckets } = await import('@/utils/storageUtils');
  return await createBuckets();
};
