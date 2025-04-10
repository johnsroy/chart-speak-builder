
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceRole);
    
    // Get the action from the request
    const { action } = await req.json();
    
    if (action === 'create-buckets') {
      // Create the necessary buckets
      const requiredBuckets = ['datasets', 'secure', 'cold_storage'];
      const results = [];
      
      // Check existing buckets
      const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        throw new Error(`Failed to list buckets: ${listError.message}`);
      }
      
      const existingBucketNames = existingBuckets?.map(b => b.name) || [];
      
      // Create missing buckets
      for (const bucketName of requiredBuckets) {
        if (!existingBucketNames.includes(bucketName)) {
          try {
            const { data, error } = await supabase.storage.createBucket(bucketName, {
              public: true, // Make buckets public for easier access
              fileSizeLimit: 100 * 1024 * 1024, // 100MB limit
            });
            
            if (error) {
              console.error(`Error creating bucket ${bucketName}:`, error);
              results.push({ bucketName, success: false, error: error.message });
            } else {
              console.log(`Successfully created bucket: ${bucketName}`);
              results.push({ bucketName, success: true });
              
              // Create RLS policy for the bucket
              await createBucketPolicy(supabase, bucketName);
            }
          } catch (error) {
            console.error(`Exception creating bucket ${bucketName}:`, error);
            results.push({ 
              bucketName, 
              success: false, 
              error: error instanceof Error ? error.message : String(error) 
            });
          }
        } else {
          console.log(`Bucket ${bucketName} already exists`);
          results.push({ bucketName, success: true, message: "Already exists" });
          
          // Ensure policy exists for existing bucket
          await createBucketPolicy(supabase, bucketName);
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Storage setup complete", 
          details: results 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: "Unknown action specified"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400
      }
    );
  }
});

// Helper function to create storage policies for a bucket
async function createBucketPolicy(supabase, bucketName) {
  try {
    // Create policies for the specified bucket using RPC function
    // We use service-role access to execute this
    const { data, error } = await supabase.rpc('create_storage_policy', { 
      bucket_name: bucketName 
    });
    
    if (error) {
      console.error(`Error creating storage policy for ${bucketName}:`, error);
      return false;
    }
    
    console.log(`Storage policy created/updated for ${bucketName}`);
    return true;
  } catch (error) {
    console.error(`Failed to create storage policy for ${bucketName}:`, error);
    return false;
  }
}
