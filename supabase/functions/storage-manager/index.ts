
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.43.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 200 });
  }

  try {
    console.log("Storage manager executing...");
    
    // Parse request body
    let action = "unknown";
    let body = {};
    
    try {
      body = await req.json();
      action = body.action || "unknown";
      console.log("Request body parsed successfully:", { action });
    } catch (e) {
      console.error("Error parsing request body:", e);
      // If JSON parsing fails, try to get action from URL
      const url = new URL(req.url);
      const pathParts = url.pathname.split("/");
      action = pathParts[pathParts.length - 1];
      console.log("Action extracted from URL path:", action);
    }

    // Get Supabase URL and service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Server configuration error: Missing Supabase credentials" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Create Supabase client with service role key for admin privileges
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log("Executing action:", action);
    
    switch (action) {
      case "setup":
      case "force-create-buckets":
        return await createBuckets(supabase);
      case "sample":
        return await addSampleData(supabase);
      default:
        console.log("Unknown action requested:", action);
        return new Response(
          JSON.stringify({ success: false, message: `Unknown action: ${action}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in storage-manager:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || "Unknown server error",
        stack: error.stack
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Function to create storage buckets
async function createBuckets(supabase) {
  try {
    console.log("Creating storage buckets...");
    const requiredBuckets = ["datasets", "secure", "cold_storage"];
    const results = [];

    // Get list of existing buckets
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error("Error listing buckets:", listError);
      throw new Error(`Error listing buckets: ${listError.message}`);
    }
    
    const existingBucketNames = (existingBuckets || []).map(b => b.name);
    console.log("Existing bucket names:", existingBucketNames);

    // Create each required bucket if it doesn't exist
    for (const bucketName of requiredBuckets) {
      if (!existingBucketNames.includes(bucketName)) {
        try {
          console.log(`Creating bucket: ${bucketName}`);
          const { data, error } = await supabase.storage.createBucket(bucketName, {
            public: true,  // Make buckets public
          });

          results.push({
            bucket: bucketName,
            created: !error,
            error: error?.message
          });

          if (error) {
            console.error(`Error creating bucket ${bucketName}:`, error);
          } else {
            console.log(`Successfully created bucket: ${bucketName}`);
          }
        } catch (bucketError) {
          console.error(`Exception creating bucket ${bucketName}:`, bucketError);
          results.push({
            bucket: bucketName,
            created: false,
            error: bucketError.message
          });
        }
      } else {
        console.log(`Bucket ${bucketName} already exists`);
        results.push({
          bucket: bucketName,
          created: false,
          message: "Bucket already exists"
        });
      }
    }

    // Add RLS policies for the buckets
    try {
      await addBucketPolicies(supabase);
    } catch (policyError) {
      console.warn("Error adding bucket policies:", policyError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Storage setup completed", 
        details: results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error creating buckets:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || "Error creating buckets",
        stack: error.stack
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}

// Function to add storage policies
async function addBucketPolicies(supabase) {
  try {
    console.log("Adding bucket policies...");
    // For each bucket, create policies for public read access
    const requiredBuckets = ["datasets", "secure", "cold_storage"];
    
    for (const bucket of requiredBuckets) {
      try {
        // Add a policy for public read access using SQL query
        const { error: readError } = await supabase.rpc('create_storage_policy', {
          bucket_name: bucket,
          policy_name: `${bucket}_public_read`,
          definition: `bucket_id = '${bucket}'`,
          operation: 'SELECT',
          role_name: 'anon'
        });
        
        if (readError) console.warn(`Error creating read policy for ${bucket}:`, readError);
        
        // Add policies for authenticated user access
        const { error: insertError } = await supabase.rpc('create_storage_policy', {
          bucket_name: bucket,
          policy_name: `${bucket}_auth_insert`,
          definition: `bucket_id = '${bucket}' AND auth.role() = 'authenticated'`,
          operation: 'INSERT',
          role_name: 'authenticated'
        });
        
        if (insertError) console.warn(`Error creating insert policy for ${bucket}:`, insertError);
        
        const { error: updateError } = await supabase.rpc('create_storage_policy', {
          bucket_name: bucket,
          policy_name: `${bucket}_auth_update`,
          definition: `bucket_id = '${bucket}' AND auth.role() = 'authenticated'`,
          operation: 'UPDATE',
          role_name: 'authenticated'
        });
        
        if (updateError) console.warn(`Error creating update policy for ${bucket}:`, updateError);
        
        const { error: deleteError } = await supabase.rpc('create_storage_policy', {
          bucket_name: bucket,
          policy_name: `${bucket}_auth_delete`,
          definition: `bucket_id = '${bucket}' AND auth.role() = 'authenticated'`,
          operation: 'DELETE',
          role_name: 'authenticated'
        });
        
        if (deleteError) console.warn(`Error creating delete policy for ${bucket}:`, deleteError);
      } catch (e) {
        console.warn(`Error setting policies for bucket ${bucket}:`, e);
      }
    }
    
    console.log("Successfully added bucket policies");
    return true;
  } catch (error) {
    console.error("Error adding bucket policies:", error);
    return false;
  }
}

// Function to add sample data to buckets
async function addSampleData(supabase) {
  try {
    console.log("Adding sample data to buckets...");
    // Example: Add a sample README.txt to each bucket
    const buckets = ["datasets", "secure", "cold_storage"];
    const results = [];
    
    for (const bucket of buckets) {
      try {
        const content = `This is a sample file in the ${bucket} bucket.\nCreated at ${new Date().toISOString()}`;
        const { error } = await supabase.storage
          .from(bucket)
          .upload("README.txt", content, {
            contentType: "text/plain",
            upsert: true
          });
        
        if (error) {
          console.error(`Error adding sample file to ${bucket}:`, error);
          results.push({
            bucket,
            success: false,
            error: error.message
          });
        } else {
          console.log(`Added sample file to ${bucket}`);
          results.push({
            bucket,
            success: true
          });
        }
      } catch (uploadError) {
        console.error(`Error adding sample file to ${bucket}:`, uploadError);
        results.push({
          bucket,
          success: false,
          error: uploadError.message
        });
      }
    }
    
    return new Response(
      JSON.stringify({ success: true, message: "Sample data added", details: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error adding sample data:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: error.message || "Error adding sample data",
        stack: error.stack
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}
