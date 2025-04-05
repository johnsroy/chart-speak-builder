
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
    
    // Special debug operation to help identify issues
    if (operation === "debug-info") {
      // Get environment information that might help with debugging
      const debugInfo = {
        deploymentId: Deno.env.get("SUPABASE_FUNCTION_DEPLOYMENT_ID") || "unknown",
        functionName: Deno.env.get("SUPABASE_FUNCTION_NAME") || "unknown",
        projectRef: Deno.env.get("SUPABASE_PROJECT_REF") || "unknown",
        version: Deno.version,
        hasServiceKey: Boolean(supabaseServiceKey),
        hasUrl: Boolean(supabaseUrl),
      };

      return new Response(
        JSON.stringify({ success: true, debug: debugInfo }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }
    
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
      } else if (operation === "check-buckets") {
        // Check if required buckets exist
        const { data: buckets, error } = await supabase.storage.listBuckets();
        
        if (error) {
          return new Response(
            JSON.stringify({ success: false, message: error.message }),
            { 
              headers: { ...corsHeaders, "Content-Type": "application/json" }, 
              status: 500 
            }
          );
        }
        
        const requiredBuckets = ['datasets', 'secure', 'cold_storage'];
        const existingBuckets = buckets?.map(b => b.name) || [];
        const missingBuckets = requiredBuckets.filter(b => !existingBuckets.includes(b));
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            buckets: existingBuckets,
            missingBuckets,
            allBucketsExist: missingBuckets.length === 0
          }),
          { 
            headers: { ...corsHeaders, "Content-Type": "application/json" }, 
            status: 200 
          }
        );
      } else if (operation === "force-create-buckets") {
        // Force create all required buckets regardless of existing ones
        const result = await forceCreateBuckets(supabase);
        return new Response(
          JSON.stringify(result),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
          }
        );
      } else if (operation === "create-datasets-bucket") {
        // This focused operation just creates the datasets bucket
        try {
          // Try to delete the bucket first (ignore errors)
          try {
            await supabase.storage.deleteBucket("datasets");
          } catch (err) {
            // Ignore deletion errors
          }
          
          // Create the datasets bucket
          const { data, error } = await supabase.storage.createBucket("datasets", {
            public: false,
            fileSizeLimit: 50 * 1024 * 1024
          });
          
          if (error) {
            return new Response(
              JSON.stringify({ success: false, message: error.message }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500
              }
            );
          }
          
          // Verify the bucket exists
          const { data: buckets, error: listError } = await supabase.storage.listBuckets();
          
          if (listError) {
            return new Response(
              JSON.stringify({ success: false, message: listError.message }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500
              }
            );
          }
          
          const hasDatasetsBacket = buckets?.some(b => b.name === "datasets");
          
          return new Response(
            JSON.stringify({ 
              success: hasDatasetsBacket,
              message: hasDatasetsBacket ? "datasets bucket created successfully" : "datasets bucket creation failed"
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: hasDatasetsBacket ? 200 : 500
            }
          );
        } catch (err) {
          return new Response(
            JSON.stringify({ success: false, message: err.message }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 500
            }
          );
        }
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

// Helper to force create all required buckets regardless of existing state
async function forceCreateBuckets(supabase) {
  try {
    // Define required buckets with their configurations
    const requiredBuckets = [
      { name: 'datasets', public: false },
      { name: 'secure', public: false },
      { name: 'cold_storage', public: false }
    ];
    
    const results = [];
    
    for (const bucket of requiredBuckets) {
      try {
        // Try to delete the bucket if it exists (ignore errors)
        try {
          await supabase.storage.deleteBucket(bucket.name);
          console.log(`Deleted existing bucket: ${bucket.name}`);
        } catch (err) {
          console.log(`Bucket ${bucket.name} does not exist or couldn't be deleted, creating new`);
        }
        
        // Small delay to ensure the deletion is processed
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Create the bucket with specified configuration
        const { data, error } = await supabase.storage.createBucket(bucket.name, {
          public: bucket.public,
          fileSizeLimit: 50 * 1024 * 1024 // 50MB limit
        });
        
        if (error) {
          console.error(`Failed to create bucket ${bucket.name}:`, error);
          results.push({
            bucket: bucket.name,
            success: false,
            message: error.message
          });
        } else {
          console.log(`Successfully created bucket: ${bucket.name}`);
          results.push({
            bucket: bucket.name,
            success: true
          });
        }
      } catch (createError) {
        console.error(`Exception creating bucket ${bucket.name}:`, createError);
        results.push({
          bucket: bucket.name,
          success: false,
          message: createError.message
        });
      }
      
      // Small delay between bucket operations
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Verify buckets after creation attempts
    const { data: verifyBuckets, error: verifyError } = await supabase.storage.listBuckets();
    
    if (verifyError) {
      return {
        success: false,
        message: `Failed to verify buckets after creation: ${verifyError.message}`,
        results
      };
    }
    
    const existingBuckets = verifyBuckets?.map(b => b.name) || [];
    const allBucketsCreated = requiredBuckets.every(b => existingBuckets.includes(b.name));
    
    if (allBucketsCreated) {
      return {
        success: true,
        message: "All buckets were successfully created",
        buckets: existingBuckets,
        results
      };
    } else {
      const missingBuckets = requiredBuckets
        .filter(b => !existingBuckets.includes(b.name))
        .map(b => b.name);
      
      return {
        success: false,
        message: `Some buckets could not be created: ${missingBuckets.join(', ')}`,
        existing: existingBuckets,
        missing: missingBuckets,
        results
      };
    }
  } catch (error) {
    console.error("Failed to create storage buckets:", error);
    return { success: false, message: error.message };
  }
}

async function setupStorageBuckets(supabase) {
  try {
    // Get a list of existing buckets first
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error("Failed to list buckets:", listError);
      // If we can't list buckets, try to force create them
      return forceCreateBuckets(supabase);
    }
    
    const existingBucketNames = existingBuckets?.map(b => b.name) || [];
    console.log("Existing buckets:", existingBucketNames);
    
    // Define required buckets with their configurations
    const requiredBuckets = [
      { name: 'datasets', public: false },
      { name: 'secure', public: false },
      { name: 'cold_storage', public: false }
    ];
    
    // Create buckets that don't exist yet
    const creationResults = [];
    let hadCreationError = false;
    
    for (const bucket of requiredBuckets) {
      if (!existingBucketNames.includes(bucket.name)) {
        console.log(`Creating bucket: ${bucket.name}`);
        try {
          const { data, error } = await supabase.storage.createBucket(bucket.name, {
            public: bucket.public,
            fileSizeLimit: 50 * 1024 * 1024 // 50MB limit
          });
          
          if (error) {
            console.error(`Failed to create bucket ${bucket.name}:`, error);
            creationResults.push({
              bucket: bucket.name,
              success: false,
              message: error.message
            });
            hadCreationError = true;
          } else {
            console.log(`Successfully created bucket: ${bucket.name}`);
            creationResults.push({
              bucket: bucket.name,
              success: true
            });
          }
        } catch (createError) {
          console.error(`Exception creating bucket ${bucket.name}:`, createError);
          creationResults.push({
            bucket: bucket.name,
            success: false,
            message: createError.message
          });
          hadCreationError = true;
        }
      } else {
        console.log(`Bucket ${bucket.name} already exists`);
        creationResults.push({
          bucket: bucket.name,
          success: true,
          existing: true
        });
      }
    }
    
    // If we had any errors, try the force create method
    if (hadCreationError) {
      console.log("Had creation errors, attempting to force create all buckets");
      return forceCreateBuckets(supabase);
    }
    
    // Verify buckets after creation attempts
    const { data: verifyBuckets, error: verifyError } = await supabase.storage.listBuckets();
    
    if (verifyError) {
      console.error("Failed to verify buckets after creation:", verifyError);
      return { 
        success: false, 
        message: "Failed to verify buckets after creation",
        error: verifyError.message,
        results: creationResults
      };
    }
    
    const finalBucketNames = verifyBuckets?.map(b => b.name) || [];
    const allBucketsExist = requiredBuckets.every(b => finalBucketNames.includes(b.name));
    
    if (allBucketsExist) {
      return {
        success: true,
        message: "All required buckets exist or were created successfully",
        buckets: finalBucketNames,
        results: creationResults
      };
    } else {
      const missingBuckets = requiredBuckets
        .filter(b => !finalBucketNames.includes(b.name))
        .map(b => b.name);
        
      // Try force creating if verification failed
      console.log("Verification failed, missing buckets:", missingBuckets);
      return forceCreateBuckets(supabase);
    }
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
    
    // Make sure datasets bucket exists before uploading
    console.log("Ensuring buckets exist before sample upload");
    const setupResult = await setupStorageBuckets(supabase);
    
    if (!setupResult.success) {
      return {
        success: false,
        message: `Failed to create required buckets: ${setupResult.message}`
      };
    }
    
    console.log("Buckets verified, uploading sample file");
    
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
    try {
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
    } catch (metadataError) {
      return {
        success: true,
        upload: "success",
        metadata: "failed",
        message: `Sample file uploaded but metadata operation failed: ${metadataError.message}`
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
