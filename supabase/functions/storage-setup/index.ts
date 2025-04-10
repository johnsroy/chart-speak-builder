
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
    const supabase = createClient(supabaseUrl, supabaseServiceRole, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    
    // Get the action from the request
    const { action, force = false } = await req.json();
    
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
      
      // Create missing buckets or check existing ones
      for (const bucketName of requiredBuckets) {
        const bucketExists = existingBucketNames.includes(bucketName);
        
        if (!bucketExists) {
          try {
            console.log(`Creating bucket ${bucketName}...`);
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
          console.log(`Bucket ${bucketName} already exists ${force ? '(will update policies)' : ''}`);
          results.push({ bucketName, success: true, message: "Already exists" });
        }
        
        // Try to create policies using direct SQL approach
        try {
          console.log(`Creating direct SQL policies for ${bucketName}...`);
          
          // Simple array of policy operations to try
          const policyOperations = [
            {
              name: `allow_public_select_${bucketName}`,
              operation: 'SELECT',
              permission: 'true', // Allow all reads
              definition: "bucket_id = '" + bucketName + "'"
            },
            {
              name: `allow_public_insert_${bucketName}`,
              operation: 'INSERT',
              permission: 'true', // Allow all writes
              definition: "bucket_id = '" + bucketName + "'"
            },
            {
              name: `allow_public_update_${bucketName}`,
              operation: 'UPDATE',
              permission: 'true', // Allow all updates
              definition: "bucket_id = '" + bucketName + "'"
            },
            {
              name: `allow_public_delete_${bucketName}`,
              operation: 'DELETE',
              permission: 'true', // Allow all deletes
              definition: "bucket_id = '" + bucketName + "'"
            }
          ];
          
          // Loop through each policy operation and create it
          for (const policy of policyOperations) {
            try {
              // Use a parameterized query to safely create the policy
              const { error: policyError } = await supabase.rpc('create_storage_policy_custom', {
                p_name: policy.name,
                p_operation: policy.operation,
                p_definition: policy.definition,
                p_check: policy.permission
              });
              
              if (policyError) {
                console.error(`Error creating ${policy.operation} policy for ${bucketName}:`, policyError);
                
                // Try alternative approach if the first one fails
                try {
                  // Alternative approach: Direct SQL for maximum compatibility
                  const { error: fallbackError } = await supabase.rpc('execute_sql', {
                    sql_command: `
                      DROP POLICY IF EXISTS "${policy.name}" ON storage.objects;
                      CREATE POLICY "${policy.name}" 
                      ON storage.objects
                      FOR ${policy.operation}
                      USING (${policy.definition})
                      WITH CHECK (${policy.permission});
                    `
                  });
                  
                  if (fallbackError) {
                    console.error(`Fallback policy creation failed for ${bucketName} (${policy.operation}):`, fallbackError);
                  } else {
                    console.log(`Created ${policy.operation} policy for ${bucketName} using fallback method`);
                  }
                } catch (fallbackError) {
                  console.error(`Fallback policy exception for ${bucketName} (${policy.operation}):`, fallbackError);
                }
              } else {
                console.log(`Created ${policy.operation} policy for ${bucketName}`);
              }
            } catch (policyError) {
              console.error(`Exception creating ${policy.operation} policy for ${bucketName}:`, policyError);
            }
          }
        } catch (directPolicyError) {
          console.error(`Direct policy creation failed for ${bucketName}:`, directPolicyError);
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
