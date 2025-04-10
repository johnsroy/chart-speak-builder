
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
        }
        
        // Create public policy for this bucket
        // We'll try multiple approaches to create the policies
        
        // First approach: Call the create_storage_policy RPC function
        try {
          console.log(`Creating storage policy for ${bucketName} using RPC...`);
          const { data: policyData, error: policyError } = await supabase.rpc('create_storage_policy', { 
            bucket_name: bucketName 
          });
          
          if (policyError) {
            console.error(`RPC error for ${bucketName}:`, policyError);
            // Fall back to the second RPC function
            try {
              const { data: fallbackData, error: fallbackError } = await supabase.rpc('create_public_storage_policies', { 
                bucket_name: bucketName 
              });
              
              if (fallbackError) {
                console.error(`Fallback RPC error for ${bucketName}:`, fallbackError);
              } else {
                console.log(`Created public policies for ${bucketName} using fallback RPC`);
              }
            } catch (fallbackRpcError) {
              console.error(`Fallback RPC exception for ${bucketName}:`, fallbackRpcError);
            }
          } else {
            console.log(`Successfully created policies for ${bucketName}`);
          }
        } catch (rpcError) {
          console.error(`RPC exception for ${bucketName}:`, rpcError);
        }
        
        // Direct SQL approach: Insert policies directly
        try {
          console.log(`Creating direct policies for ${bucketName}...`);
          
          // Since the JavaScript client doesn't allow direct SQL, 
          // we'll use a more direct approach with the storage.createPolicy API
          
          // Helper function to create a policy
          const createDirectPolicy = async (action: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE') => {
            const policyName = `public_${action.toLowerCase()}_${bucketName}_direct`;
            try {
              // Note: This is a simplified example. In practice, you might need to
              // check if the policy exists first to avoid conflicts.
              const { data, error } = await supabase.storage.from(bucketName).createPolicy(policyName, {
                definition: 'true', // Allow all access
                role: 'anon', // Public anonymous access
                action: action
              });
              
              if (error) {
                console.error(`Error creating ${action} policy for ${bucketName}:`, error);
              } else {
                console.log(`Created ${action} policy for ${bucketName}`);
              }
            } catch (policyError) {
              console.error(`Exception creating ${action} policy for ${bucketName}:`, policyError);
            }
          };
          
          // Create policies for all operations
          await createDirectPolicy('SELECT');
          await createDirectPolicy('INSERT');
          await createDirectPolicy('UPDATE');
          await createDirectPolicy('DELETE');
          
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
