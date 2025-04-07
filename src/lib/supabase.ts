
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
      
      // First try to call the edge function directly to create buckets
      const { callStorageManager } = await import('@/utils/storageUtils');
      
      try {
        console.log("Attempting to create buckets via edge function...");
        const result = await callStorageManager('force-create-buckets');
        
        if (result && result.success) {
          console.log("Successfully created storage buckets via edge function");
          
          // Try to add sample data to the buckets
          try {
            await callStorageManager('sample');
          } catch (sampleError) {
            console.warn("Failed to add sample data:", sampleError);
          }
          
          // Set up admin user now that storage is ready
          try {
            const { authService } = await import('@/services/authService');
            await authService.setupAdminUser().catch(err => {
              console.warn("Admin user setup had an issue, but continuing:", err.message);
            });
          } catch (authError) {
            console.warn("Error setting up admin user, but continuing:", authError);
          }
          
          return;
        } else {
          console.warn("Edge function bucket creation failed, trying alternate methods");
        }
      } catch (edgeFunctionError) {
        console.warn("Edge function approach failed:", edgeFunctionError);
      }
      
      // Fall back to checking if buckets already exist
      try {
        const { verifyStorageBuckets, createStorageBuckets } = await import('@/utils/storageUtils');
        
        // Check if buckets already exist
        const bucketsExist = await verifyStorageBuckets().catch(() => false);
        
        if (bucketsExist) {
          console.log("All required storage buckets already exist");
          
          // Try to set up admin user
          try {
            const { authService } = await import('@/services/authService');
            await authService.setupAdminUser().catch(err => {
              console.warn("Admin user setup had an issue, but continuing:", err.message);
            });
          } catch (authError) {
            console.warn("Error setting up admin user, but continuing:", authError);
          }
          
          return;
        }
        
        // As a last resort, try direct bucket creation
        console.log("Attempting direct bucket creation via API...");
        const success = await createStorageBuckets().catch(err => {
          console.warn("Error in direct bucket creation:", err.message);
          return false;
        });
        
        if (success) {
          console.log("Successfully created storage buckets via API");
        } else {
          console.warn("All bucket creation methods failed");
        }
      } catch (error) {
        console.warn("Error during storage setup:", error);
      }
      
      // Try to set up admin user even if storage setup failed
      try {
        const { authService } = await import('@/services/authService');
        await authService.setupAdminUser().catch(err => {
          console.warn("Admin user setup had an issue, but continuing:", err.message);
        });
      } catch (authError) {
        console.warn("Error setting up admin user, but continuing:", authError);
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
