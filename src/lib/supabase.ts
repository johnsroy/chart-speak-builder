
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
      
      // First try to set up admin user since it doesn't depend on storage
      try {
        const { authService } = await import('@/services/authService');
        await authService.setupAdminUser().catch(err => {
          console.warn("Admin user setup had an issue, but we'll continue:", err.message);
        });
      } catch (authError) {
        console.warn("Error setting up admin user, but continuing:", authError);
      }
      
      // Import utilities only when needed to avoid circular dependencies
      const { verifyStorageBuckets, createStorageBuckets, callStorageManager } = await import('@/utils/storageUtils');
      
      // Check if storage buckets already exist, if they do, we can skip the creation process
      const bucketsExist = await verifyStorageBuckets().catch(() => false);
      
      if (bucketsExist) {
        console.log("All required storage buckets already exist");
        return;
      }
      
      let storageSetupSuccess = false;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (!storageSetupSuccess && retryCount <= maxRetries) {
        try {
          // First try direct API approach to create buckets
          console.log("Attempting direct bucket creation via API...");
          const bucketsCreated = await createStorageBuckets().catch(err => {
            console.warn("Error in direct bucket creation:", err.message);
            return false;
          });
          
          if (bucketsCreated) {
            console.log("Successfully created storage buckets via API");
            storageSetupSuccess = true;
          } else {
            console.log("Direct bucket creation failed, trying edge function...");
            
            try {
              // Try the edge function with properly formatted request
              const forceCreateResult = await callStorageManager('force-create-buckets').catch(err => {
                console.warn("Error calling storage manager:", err.message);
                return null;
              });
              
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
              console.warn("Edge function approach failed:", edgeFunctionError);
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
                console.warn("Setup fallback failed:", setupError);
              }
            }
          }
        } catch (attemptError) {
          console.warn(`Storage setup attempt ${retryCount + 1} failed:`, attemptError);
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
        // We'll still continue with the app - the user can manually create buckets if needed
      }
      
      // Check and log the current session
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Current session after setup:", session ? "Present" : "Not present");
    }
  } catch (error) {
    console.warn("Failed to initialize app completely, but will continue:", error);
  }
};

// Run initialization after a short delay to ensure everything is ready
let initializeTimeout: ReturnType<typeof setTimeout> | null = null;

if (typeof window !== 'undefined') {
  // Clear any existing timeout to prevent multiple initializations
  if (initializeTimeout) clearTimeout(initializeTimeout);
  
  // Schedule the initialization with a delay
  initializeTimeout = setTimeout(() => {
    initializeApp().catch(err => {
      console.warn("App initialization had some issues, but we'll continue:", err);
    });
  }, 1000);
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
