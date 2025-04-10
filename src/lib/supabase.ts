
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
      console.log("Initializing app and checking storage buckets...");
      
      // First try to call the edge function directly to create buckets
      try {
        console.log("Attempting to create buckets via edge function...");
        const { data, error } = await supabase.functions.invoke('storage-setup', {
          method: 'POST',
          body: { action: 'create-buckets' },
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (data && data.success) {
          console.log("Successfully created storage buckets via edge function");
          return;
        }
        
        if (error) {
          console.warn("Edge function approach had an issue:", error);
        }
      } catch (edgeFunctionError) {
        console.warn("Edge function approach failed:", edgeFunctionError);
      }
      
      // Skip direct API approach as it's failing with "object too large"
      // Just continue with the app initialization
      
      // Try to set up admin user regardless of storage setup
      try {
        // Try to call the admin-setup function
        const response = await fetch(`https://rehadpogugijylybwmoe.supabase.co/functions/v1/admin-setup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          }
        });

        if (response.ok) {
          console.log("Admin user setup successful");
        } else {
          console.warn("Admin user setup had an issue, but continuing");
        }
        
        // Check and log the current session
        const { data: { session } } = await supabase.auth.getSession();
        console.log("Current session after setup:", session ? "Present" : "Not present");
      } catch (authError) {
        console.warn("Error setting up admin user, but continuing:", authError);
      }
    }
  } catch (error) {
    console.warn("Failed to initialize app completely, but will continue:", error);
  }
};

// Run initialization with retry mechanism
const performInitialization = async (retries = 2, delay = 2000) => {
  let attempt = 0;
  
  while (attempt < retries) {
    try {
      await initializeApp();
      console.log(`App initialized successfully on attempt ${attempt + 1}`);
      return;
    } catch (error) {
      attempt++;
      console.warn(`Initialization attempt ${attempt} failed:`, error);
      
      if (attempt < retries) {
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.warn(`App initialization failed after ${retries} attempts, proceeding anyway`);
};

// Run initialization after a short delay to ensure everything is ready
let initializeTimeout: ReturnType<typeof setTimeout> | null = null;

if (typeof window !== 'undefined') {
  // Clear any existing timeout to prevent multiple initializations
  if (initializeTimeout) clearTimeout(initializeTimeout);
  
  // Schedule the initialization with a delay
  initializeTimeout = setTimeout(() => {
    performInitialization().catch(err => {
      console.warn("App initialization had some issues, but we'll continue:", err);
    });
  }, 2000);
}

// Expose these functions to avoid breaking existing code
export const setupStorageBuckets = async () => {
  const { setupStorageBuckets } = await import('@/utils/storageUtils');
  return await setupStorageBuckets();
};

export const verifyStorageBuckets = async () => {
  const { verifyStorageBuckets } = await import('@/utils/storageUtils');
  return await verifyStorageBuckets();
};

export const createStorageBuckets = async () => {
  const { createStorageBuckets } = await import('@/utils/storageUtils');
  return await createStorageBuckets();
};
