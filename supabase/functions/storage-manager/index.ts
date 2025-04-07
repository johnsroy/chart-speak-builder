
// Create this file if it doesn't exist
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
    console.log("Storage manager executing action:", req.url);

    // Extract action from request body
    let body;
    try {
      body = await req.json();
      console.log("Storage manager called with action:", body.action);
    } catch (e) {
      // If JSON parsing fails, try to get action from URL
      const url = new URL(req.url);
      const pathParts = url.pathname.split("/");
      const actionFromUrl = pathParts[pathParts.length - 1];
      console.log("Storage manager called with action from URL:", actionFromUrl);
      body = { action: actionFromUrl };
    }

    // Get required Supabase credentials
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }

    // Create a Supabase client with the service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const action = body.action || "unknown";

    // Handle different actions
    switch (action) {
      case "setup":
      case "force-create-buckets":
        return await createBuckets(supabase);
      case "sample":
        return await addSampleData(supabase);
      default:
        return new Response(
          JSON.stringify({ success: false, message: `Unknown action: ${action}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in storage-manager:", error);
    
    return new Response(
      JSON.stringify({ success: false, message: error.message || "Unknown server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Function to create storage buckets
async function createBuckets(supabase) {
  try {
    const requiredBuckets = ["datasets", "secure", "cold_storage"];
    const results = [];

    // Get list of existing buckets
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      throw new Error(`Error listing buckets: ${listError.message}`);
    }
    
    const existingBucketNames = (existingBuckets || []).map(b => b.name);
    console.log("Existing bucket names:", existingBucketNames);

    // Create each required bucket if it doesn't exist
    for (const bucketName of requiredBuckets) {
      if (!existingBucketNames.includes(bucketName)) {
        try {
          const { error } = await supabase.storage.createBucket(bucketName, {
            public: true,  // Make buckets public
          });

          results.push({
            bucket: bucketName,
            created: !error,
            error: error?.message
          });

          if (error) {
            console.error(`Error creating bucket ${bucketName}:`, error.message);
          } else {
            console.log(`Created bucket: ${bucketName}`);
          }
        } catch (bucketError) {
          console.error(`Error creating bucket ${bucketName}:`, bucketError);
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
      JSON.stringify({ success: true, message: "Storage setup completed", details: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("Error creating buckets:", error);
    return new Response(
      JSON.stringify({ success: false, message: error.message || "Error creating buckets" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}

// Function to add storage policies
async function addBucketPolicies(supabase) {
  try {
    // For each bucket, create policies for public read access
    const requiredBuckets = ["datasets", "secure", "cold_storage"];
    
    for (const bucket of requiredBuckets) {
      // Add a policy for public read access
      await supabase.rpc('create_storage_policy', {
        bucket_name: bucket,
        policy_name: `${bucket}_public_read`,
        definition: `bucket_id = '${bucket}'`,
        operation: 'SELECT',
        role_name: 'anon'
      });
      
      // Add policies for authenticated user access
      await supabase.rpc('create_storage_policy', {
        bucket_name: bucket,
        policy_name: `${bucket}_auth_insert`,
        definition: `bucket_id = '${bucket}' AND auth.role() = 'authenticated'`,
        operation: 'INSERT',
        role_name: 'authenticated'
      });
      
      await supabase.rpc('create_storage_policy', {
        bucket_name: bucket,
        policy_name: `${bucket}_auth_update`,
        definition: `bucket_id = '${bucket}' AND auth.role() = 'authenticated'`,
        operation: 'UPDATE',
        role_name: 'authenticated'
      });
      
      await supabase.rpc('create_storage_policy', {
        bucket_name: bucket,
        policy_name: `${bucket}_auth_delete`,
        definition: `bucket_id = '${bucket}' AND auth.role() = 'authenticated'`,
        operation: 'DELETE',
        role_name: 'authenticated'
      });
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
      JSON.stringify({ success: false, message: error.message || "Error adding sample data" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
}
