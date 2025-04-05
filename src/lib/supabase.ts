
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
