
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

// Initialize storage and admin user on app startup
const initializeApp = async () => {
  try {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      // First verify storage buckets exist
      console.log("Verifying storage buckets...");
      
      const { data: buckets, error } = await supabase.storage.listBuckets();
      if (error) {
        console.error("Failed to list storage buckets:", error);
      } else {
        console.log("Storage buckets found:", buckets?.map(b => b.name).join(", ") || "None");
        
        // If datasets bucket doesn't exist, try to create it
        if (!buckets?.some(b => b.name === 'datasets')) {
          console.log("Creating 'datasets' bucket");
          const { error: createError } = await supabase.storage.createBucket('datasets', {
            public: false,
            fileSizeLimit: 100 * 1024 * 1024 // 100MB
          });
          
          if (createError) {
            console.error("Failed to create 'datasets' bucket:", createError);
          } else {
            console.log("Successfully created 'datasets' bucket");
          }
        }
      }
      
      // Initialize admin user
      const { authService } = await import('@/services/authService');
      await authService.setupAdminUser();
      
      // Check and log the current session
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Current session after setup:", session ? "Present" : "Not present");
    }
  } catch (error) {
    console.error("Failed to initialize app:", error);
  }
};

// Only run in browser environment and only once
if (typeof window !== 'undefined') {
  initializeApp();
}
