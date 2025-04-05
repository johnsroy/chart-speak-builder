
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
    // Get Supabase credentials from environment
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase credentials not properly configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request to get operation
    const url = new URL(req.url);
    const { pathname } = url;
    const operation = pathname.split('/').pop();
    
    if (req.method === "POST") {
      if (operation === "setup") {
        // Setup storage buckets if they don't exist
        const result = await setupStorageBuckets(supabase);
        return new Response(
          JSON.stringify(result),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" }, 
            status: 200 
          }
        );
      } else if (operation === "sample") {
        // Add sample file to buckets
        const result = await addSampleFiles(supabase);
        return new Response(
          JSON.stringify(result),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" }, 
            status: 200 
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: false, message: "Invalid operation" }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 400 
      }
    );
  } catch (error) {
    console.error("Server error:", error);
    
    return new Response(
      JSON.stringify({ success: false, message: error.message || "Server error" }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 500 
      }
    );
  }
});

async function setupStorageBuckets(supabase) {
  try {
    // Try to get existing buckets
    const { data: buckets, error: getBucketsError } = await supabase.storage.listBuckets();
    
    if (getBucketsError) {
      throw getBucketsError;
    }
    
    const existingBuckets = buckets.map(bucket => bucket.name);
    const bucketsToCreate = ['datasets', 'cold_storage'].filter(
      bucketName => !existingBuckets.includes(bucketName)
    );
    
    // Create required buckets if they don't exist
    const results = [];
    for (const bucketName of bucketsToCreate) {
      const { data, error } = await supabase.storage.createBucket(bucketName, {
        public: false,
      });
      
      results.push({
        bucketName,
        success: !error,
        error: error?.message
      });
    }
    
    // Set up RLS policies for the buckets
    for (const bucketName of bucketsToCreate) {
      await setupBucketPolicies(supabase, bucketName);
    }
    
    return { 
      success: true, 
      created: results,
      existing: existingBuckets
    };
  } catch (error) {
    console.error("Failed to setup storage buckets:", error);
    return { success: false, message: error.message };
  }
}

async function setupBucketPolicies(supabase, bucketName) {
  // This sets up policies via SQL since the JS client doesn't support policy management
  const { error } = await supabase.rpc('setup_bucket_policies', { bucket_name: bucketName });
  
  if (error) {
    console.error(`Failed to set up policies for bucket ${bucketName}:`, error);
  }
  
  return { success: !error };
}

async function addSampleFiles(supabase) {
  try {
    const adminId = '00000000-0000-0000-0000-000000000000';
    const results = [];
    
    // Add sample files to both buckets
    const buckets = ['datasets', 'cold_storage'];
    
    for (const bucket of buckets) {
      // Create a small sample CSV file
      const sampleCsvContent = 
`id,name,age,city,income
1,John Doe,32,New York,75000
2,Jane Smith,28,Los Angeles,82000
3,Bob Johnson,45,Chicago,65000
4,Alice Brown,36,Houston,90000
5,Charlie Wilson,29,Phoenix,72000`;

      const sampleFile = new Blob([sampleCsvContent], { type: 'text/csv' });
      const filePath = `${adminId}/sample-data-${bucket}.csv`;
      
      // Upload the file
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, sampleFile, {
          cacheControl: '3600',
          upsert: true
        });
      
      results.push({
        bucket,
        filePath,
        success: !error,
        error: error?.message,
        url: error ? null : data?.Key
      });
      
      // If upload was successful, add metadata to the dataset table
      if (!error) {
        const { error: dbError } = await supabase.from('datasets').insert({
          name: `Sample Dataset (${bucket})`,
          description: `A sample dataset for demonstration purposes in the ${bucket} bucket`,
          user_id: adminId,
          file_name: `sample-data-${bucket}.csv`,
          file_size: sampleCsvContent.length,
          row_count: 5,
          column_schema: {
            id: 'integer',
            name: 'string',
            age: 'integer',
            city: 'string',
            income: 'integer'
          },
          storage_type: 'supabase',
          storage_path: filePath,
          storage_bucket: bucket
        });
        
        if (dbError) {
          console.error(`Error adding sample dataset metadata for ${bucket}:`, dbError);
          results[results.length - 1].metadataSuccess = false;
          results[results.length - 1].metadataError = dbError.message;
        } else {
          results[results.length - 1].metadataSuccess = true;
        }
      }
    }
    
    return { 
      success: results.every(r => r.success), 
      results 
    };
  } catch (error) {
    console.error("Error adding sample files:", error);
    return { success: false, message: error.message };
  }
}
