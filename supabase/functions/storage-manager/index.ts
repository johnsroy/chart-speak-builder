
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Define required bucket names
const REQUIRED_BUCKETS = ['datasets', 'secure', 'cold_storage'];

// CORS headers to allow cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    if (!supabaseUrl || !supabaseServiceRole) {
      throw new Error("Missing Supabase environment variables");
    }
    
    // Create Supabase client with the service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceRole);
    
    // Extract the action from the request body
    let action = "";
    
    try {
      const body = await req.json();
      action = body?.action || "";
      console.log(`Storage manager called with action from body: ${action}`);
    } catch (parseError) {
      // If parsing JSON fails, try to extract action from URL path
      console.error("Error parsing request body:", parseError);
      
      // Extract path from URL to determine action
      const url = new URL(req.url);
      action = url.pathname.split('/').pop() || "";
      console.log(`Storage manager called with action from URL: ${action}`);
    }
    
    if (!action) {
      return new Response(
        JSON.stringify({ error: "No action specified" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    console.log(`Storage manager executing action: ${action}`);
    
    if (action === 'create-datasets-bucket') {
      try {
        // Create the datasets bucket if it doesn't exist
        const { data: buckets, error: listError } = await supabase
          .storage
          .listBuckets();
          
        if (listError) {
          throw new Error(`Error listing buckets: ${listError.message}`);
        }
        
        const bucketExists = buckets?.some(bucket => bucket.name === 'datasets');
        
        if (!bucketExists) {
          const { error } = await supabase
            .storage
            .createBucket('datasets', { public: true });
            
          if (error) {
            throw new Error(`Error creating datasets bucket: ${error.message}`);
          }
          
          console.log("Created datasets bucket successfully");
          
          return new Response(
            JSON.stringify({ success: true, message: "Created datasets bucket" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          console.log("Datasets bucket already exists");
          
          return new Response(
            JSON.stringify({ success: true, message: "Datasets bucket already exists" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (error) {
        console.error("Error creating datasets bucket:", error);
        
        return new Response(
          JSON.stringify({ success: false, message: error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }
    
    if (action === 'force-create-buckets') {
      try {
        const results = [];
        
        for (const bucketName of REQUIRED_BUCKETS) {
          try {
            const { error } = await supabase
              .storage
              .createBucket(bucketName, { public: true });
              
            if (error) {
              results.push({ bucket: bucketName, success: false, message: error.message });
              console.error(`Error creating bucket ${bucketName}:`, error.message);
            } else {
              results.push({ bucket: bucketName, success: true });
              
              // Add RLS policies to make the bucket accessible to all
              try {
                // This is risky but necessary to ensure data can be read/written
                await supabase.rpc('create_storage_policy', { bucket_name: bucketName });
                console.log(`Added public policies to bucket ${bucketName}`);
              } catch (policyError) {
                console.error(`Error setting policies for bucket ${bucketName}:`, policyError);
              }
            }
          } catch (bucketError) {
            results.push({ bucket: bucketName, success: false, message: bucketError.message });
            console.error(`Exception creating bucket ${bucketName}:`, bucketError);
          }
        }
        
        const allSuccessful = results.every(result => result.success);
        
        return new Response(
          JSON.stringify({ 
            success: allSuccessful,
            message: allSuccessful ? "All buckets created successfully" : "Some buckets failed to create",
            details: results 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error in force-create-buckets:", error);
        
        return new Response(
          JSON.stringify({ success: false, message: error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }
    
    if (action === 'setup') {
      try {
        // Check which buckets exist and which need to be created
        const { data: buckets, error: listError } = await supabase
          .storage
          .listBuckets();
          
        if (listError) {
          throw new Error(`Error listing buckets: ${listError.message}`);
        }
        
        const existingBuckets = buckets?.map(bucket => bucket.name) || [];
        const missingBuckets = REQUIRED_BUCKETS.filter(name => !existingBuckets.includes(name));
        
        console.log("Existing buckets:", existingBuckets);
        console.log("Missing buckets:", missingBuckets);
        
        // Create missing buckets
        const results = [];
        
        for (const bucketName of missingBuckets) {
          try {
            const { error } = await supabase
              .storage
              .createBucket(bucketName, { public: true });
              
            if (error) {
              results.push({ bucket: bucketName, success: false, message: error.message });
              console.error(`Error creating bucket ${bucketName}:`, error.message);
            } else {
              results.push({ bucket: bucketName, success: true });
              
              // Try to set public access policies
              try {
                await supabase.rpc('create_storage_policy', { bucket_name: bucketName });
              } catch (policyError) {
                console.error(`Error setting policies for ${bucketName}:`, policyError);
              }
            }
          } catch (bucketError) {
            results.push({ bucket: bucketName, success: false, message: bucketError.message });
            console.error(`Exception creating bucket ${bucketName}:`, bucketError);
          }
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            existing: existingBuckets,
            created: results,
            message: `Setup complete. ${results.filter(r => r.success).length} buckets created.`
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error in setup:", error);
        
        return new Response(
          JSON.stringify({ success: false, message: error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }
    
    if (action === 'sample') {
      try {
        // Add some sample data to buckets
        const sampleFiles = [
          { name: 'sample_data.csv', content: 'Column1,Column2,Column3\nA,1,true\nB,2,false\nC,3,true' },
          { name: 'sample_config.json', content: JSON.stringify({ name: "Sample Config", version: "1.0.0" }) }
        ];
        
        const results = [];
        
        for (const file of sampleFiles) {
          try {
            const { error } = await supabase
              .storage
              .from('datasets')
              .upload(`samples/${file.name}`, new TextEncoder().encode(file.content), {
                contentType: file.name.endsWith('.csv') ? 'text/csv' : 'application/json',
                upsert: true
              });
              
            results.push({ file: file.name, success: !error, message: error?.message });
          } catch (uploadError) {
            results.push({ file: file.name, success: false, message: uploadError.message });
            console.error(`Error uploading ${file.name}:`, uploadError);
          }
        }
        
        return new Response(
          JSON.stringify({ success: true, results }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error("Error adding samples:", error);
        
        return new Response(
          JSON.stringify({ success: false, message: error.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }
    
    return new Response(
      JSON.stringify({ error: "Invalid action specified" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  } catch (error) {
    console.error("Error in storage-manager function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
