
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
    let requestBody;
    
    try {
      requestBody = await req.json();
    } catch (jsonError) {
      console.error("Failed to parse request body as JSON:", jsonError);
      requestBody = { action: 'create-buckets', force: true };
    }
    
    const { action = 'create-buckets', force = false } = requestBody;
    
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
              fileSizeLimit: 1024 * 1024 * 1024, // 1GB limit
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
        
        // Add explicit public access policy via direct SQL
        try {
          console.log(`Creating direct public policy for ${bucketName}...`);
          
          // Execute direct SQL to create very permissive policies
          const { error: sqlError } = await supabase.rpc('execute_sql', {
            sql_query: `
              -- Drop existing policies
              DROP POLICY IF EXISTS "Public Access Policy" ON storage.objects;
              
              -- Create permissive policy (anyone can access)
              CREATE POLICY "Public Access Policy" 
              ON storage.objects 
              USING (true) 
              WITH CHECK (true);
            `
          });
          
          if (sqlError) {
            console.error(`Error creating public policy with SQL:`, sqlError);
          } else {
            console.log(`Successfully created public policy for all buckets`);
          }
        } catch (policyError) {
          console.error(`Exception creating public policy:`, policyError);
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
              // Try direct SQL execution
              const { error: directError } = await supabase.rpc('execute_sql', {
                sql_query: `
                  DROP POLICY IF EXISTS "${policy.name}" ON storage.objects;
                  CREATE POLICY "${policy.name}" 
                  ON storage.objects
                  FOR ${policy.operation}
                  USING (${policy.definition})
                  WITH CHECK (${policy.permission});
                `
              });
              
              if (!directError) {
                console.log(`Created ${policy.operation} policy for ${bucketName} using direct SQL`);
                continue;
              }
            } catch (sqlError) {
              console.warn(`SQL policy creation failed, trying alternative: ${sqlError}`);
            }
            
            // Use a parameterized query as fallback
            try {
              const { error: policyError } = await supabase.rpc('create_storage_policy', {
                bucket_name: policy.name
              });
              
              if (!policyError) {
                console.log(`Created policies for ${bucketName} using create_storage_policy function`);
              }
            } catch (fallbackError) {
              console.warn(`Fallback policy creation failed: ${fallbackError}`);
              
              // Try yet another approach if both failed
              try {
                const { error: publicPolicyError } = await supabase.rpc('create_public_storage_policies', { 
                  bucket_name: bucketName 
                });
                
                if (!publicPolicyError) {
                  console.log(`Created all policies for ${bucketName} using public_storage_policies function`);
                }
              } catch (publicError) {
                console.warn(`Public policy creation failed: ${publicError}`);
              }
            }
          }
        } catch (directPolicyError) {
          console.error(`Direct policy creation failed for ${bucketName}:`, directPolicyError);
        }
      }
      
      // Create check_column_exists function if it doesn't exist
      try {
        console.log("Creating check_column_exists function...");
        
        const { error: functionError } = await supabase.rpc('execute_sql', {
          sql_query: `
            CREATE OR REPLACE FUNCTION public.check_column_exists(
              table_name TEXT,
              column_name TEXT
            ) RETURNS BOOLEAN AS $$
            DECLARE
              column_exists BOOLEAN;
            BEGIN
              SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = $1
                AND column_name = $2
              ) INTO column_exists;
              
              RETURN column_exists;
            END;
            $$ LANGUAGE plpgsql;
          `
        });
        
        if (functionError) {
          console.error("Error creating check_column_exists function:", functionError);
        } else {
          console.log("Successfully created check_column_exists function");
        }
      } catch (functionCreationError) {
        console.error("Exception creating check_column_exists function:", functionCreationError);
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
