
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
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      console.log("Initializing app...");
      
      // First try to list buckets to see if they exist
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error("Failed to list storage buckets:", error);
        console.log("Will try to create buckets via edge function...");
        
        // Call the storage-manager edge function to set up buckets
        const setupResult = await callStorageManager('setup');
        
        if (setupResult.success) {
          console.log("Successfully set up storage buckets:", setupResult);
          
          // Add sample data to the buckets for testing
          const sampleResult = await callStorageManager('sample');
          if (sampleResult.success) {
            console.log("Added sample data to buckets:", sampleResult);
          } else {
            console.warn("Failed to add sample data:", sampleResult.message || "Unknown error");
          }
        } else {
          console.error("Failed to set up storage buckets:", setupResult.message || "Unknown error");
        }
      } else {
        // Buckets found, log them
        const bucketNames = buckets?.map(b => b.name).join(", ") || "None";
        console.log("Storage buckets found:", bucketNames);
        
        // If no 'datasets' bucket, try to create it via the edge function
        if (!buckets?.some(b => b.name === 'datasets')) {
          console.log("No 'datasets' bucket found, attempting to create via edge function...");
          const setupResult = await callStorageManager('setup');
          
          if (setupResult.success) {
            console.log("Successfully created 'datasets' bucket:", setupResult);
          } else {
            console.error("Failed to create 'datasets' bucket:", setupResult.message || "Unknown error");
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

// Only run in browser environment and only once
if (typeof window !== 'undefined') {
  initializeApp();
}

// Expose a function to manually trigger bucket setup
export const setupStorageBuckets = async () => {
  console.log("Manually triggering storage bucket setup...");
  return await callStorageManager('setup');
};

// Expose a function to verify storage buckets exist
export const verifyStorageBuckets = async () => {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error("Failed to verify storage buckets:", error);
      return false;
    }
    
    const hasDatasetsBucket = buckets?.some(b => b.name === 'datasets');
    console.log("Storage bucket verification:", hasDatasetsBucket ? "datasets bucket exists" : "datasets bucket missing");
    
    return hasDatasetsBucket;
  } catch (error) {
    console.error("Error verifying storage buckets:", error);
    return false;
  }
};
