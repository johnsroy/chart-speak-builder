
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
      const lastPathPart = pathParts[pathParts.length - 1];
      
      // Check if the last path part is a valid action
      if (["setup", "force-create-buckets", "sample"].includes(lastPathPart)) {
        action = lastPathPart;
        console.log("Action extracted from URL path:", action);
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            message: "Invalid request: Could not determine action"
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    console.log("Executing action:", action);
    
    switch (action) {
      case "setup":
      case "force-create-buckets":
        return await createBuckets(supabase, corsHeaders);
      case "sample":
        return await addSampleData(supabase, corsHeaders);
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
async function createBuckets(supabase, corsHeaders) {
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

    // Create each required bucket if it doesn't exist - with fixed options
    for (const bucketName of requiredBuckets) {
      if (!existingBucketNames.includes(bucketName)) {
        try {
          console.log(`Creating bucket: ${bucketName}`);
          // Only pass the minimal required options to avoid "object too large" errors
          const { data, error } = await supabase.storage.createBucket(bucketName, {
            public: true,
          });

          results.push({
            bucket: bucketName,
            created: !error,
            error: error?.message || null
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
        // Use direct SQL for better control over policy creation
        // This avoids issues with RLS on the storage schema
        const { data: publicAccessPolicyData, error: publicAccessPolicyError } = await supabase.rpc('create_storage_policy', {
          bucket_name: bucket,
          policy_name: `${bucket}_public_access`,
          definition: 'true', // Allow public access
          operation: 'ALL', // ALL operations (read, write, etc.)
          role_name: 'anon'
        });
        
        if (publicAccessPolicyError) {
          console.warn(`Error creating public policy for bucket ${bucket}:`, publicAccessPolicyError);
        } else {
          console.log(`Created public access policy for bucket ${bucket}`);
        }
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
async function addSampleData(supabase, corsHeaders) {
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
