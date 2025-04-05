
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
    // Try more reliable approach through SQL
    const { error: sqlError } = await supabase.rpc('create_storage_bucket', { 
      bucket_name: 'datasets',
      public_bucket: false
    });
    
    if (sqlError) {
      console.error("SQL RPC approach failed:", sqlError);
      
      // Try direct API approach as a fallback
      // Check if bucket already exists first
      const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error("Failed to list buckets:", listError);
        return { 
          success: false, 
          message: `Failed to access storage: ${listError.message}` 
        };
      }
      
      if (existingBuckets && existingBuckets.some(b => b.name === 'datasets')) {
        return {
          success: true,
          message: "Datasets bucket already exists",
          buckets: existingBuckets.map(b => b.name)
        };
      }
      
      // Create bucket through API
      const { data, error } = await supabase.storage.createBucket('datasets', {
        public: false,
        fileSizeLimit: 50 * 1024 * 1024 // 50MB limit
      });
      
      if (error) {
        console.error("Failed to create bucket through API:", error);
        return { 
          success: false, 
          message: `Failed to create bucket: ${error.message}` 
        };
      }
      
      return {
        success: true,
        message: "Successfully created datasets bucket through API",
        bucket: 'datasets'
      };
    }
    
    // Verify bucket was created
    const { data: verifyBuckets, error: verifyError } = await supabase.storage.listBuckets();
    
    if (verifyError) {
      console.error("Failed to verify buckets:", verifyError);
      return { 
        success: true, 
        message: "Bucket creation successful, but verification failed",
        error: verifyError.message
      };
    }
    
    const bucketExists = verifyBuckets?.some(b => b.name === 'datasets');
    
    return {
      success: true,
      message: bucketExists ? 
        "Successfully created or verified datasets bucket" : 
        "Bucket creation may have failed silently, please check manually",
      buckets: verifyBuckets?.map(b => b.name) || []
    };
  } catch (error) {
    console.error("Failed to setup storage buckets:", error);
    return { success: false, message: error.message };
  }
}

async function addSampleFiles(supabase) {
  try {
    const adminId = '00000000-0000-0000-0000-000000000000';
    
    // Create a small sample CSV file
    const sampleCsvContent = 
`id,name,age,city,income
1,John Doe,32,New York,75000
2,Jane Smith,28,Los Angeles,82000
3,Bob Johnson,45,Chicago,65000
4,Alice Brown,36,Houston,90000
5,Charlie Wilson,29,Phoenix,72000`;

    const sampleFile = new Blob([sampleCsvContent], { type: 'text/csv' });
    const filePath = `${adminId}/sample-data.csv`;
    
    // Upload the file
    const { data, error } = await supabase.storage
      .from('datasets')
      .upload(filePath, sampleFile, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      console.error("Error uploading sample file:", error);
      return { 
        success: false, 
        message: `Failed to upload sample: ${error.message}`
      };
    }
    
    // If upload was successful, add metadata to the dataset table
    const { error: dbError } = await supabase.from('datasets').upsert({
      name: 'Sample Dataset',
      description: 'A sample dataset for demonstration purposes',
      user_id: adminId,
      file_name: 'sample-data.csv',
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
      storage_bucket: 'datasets'
    }, { 
      onConflict: 'name,user_id' 
    }).select().maybeSingle();
    
    if (dbError) {
      console.error("Error adding sample dataset metadata:", dbError);
      return {
        success: true,
        upload: "success",
        metadata: "failed",
        message: `Sample file uploaded but metadata creation failed: ${dbError.message}`
      };
    }
    
    return { 
      success: true,
      message: "Sample dataset added successfully"
    };
  } catch (error) {
    console.error("Error adding sample files:", error);
    return { success: false, message: error.message };
  }
}
