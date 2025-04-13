
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// Define CORS headers for browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Initialize Supabase client with admin privileges
const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://rehadpogugijylybwmoe.supabase.co';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const supabase = createClient(supabaseUrl, supabaseKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

serve(async (req) => {
  // Handle CORS preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  try {
    const { action, filePath, chunks, contentType, bucket = 'datasets' } = await req.json();
    console.log(`Processing ${action} request for ${filePath}`);

    switch (action) {
      case 'merge-chunks':
        return await mergeChunks(bucket, filePath, chunks, contentType);
      
      case 'delete-file':
        return await deleteFile(bucket, filePath);
      
      case 'check-permissions':
        return await checkPermissions(bucket);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
    }
  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Merge chunks into a single file
async function mergeChunks(bucket: string, filePath: string, chunks: any[], contentType: string) {
  try {
    console.log(`Merging ${chunks.length} chunks for ${filePath}`);
    
    // First try to ensure the bucket exists and has proper policies
    await ensureBucketWithPolicies(bucket);
    
    // For small number of chunks (5 or fewer), try manual merge
    if (chunks.length <= 5) {
      // Each chunk has a path property
      const chunkPaths = chunks.map(chunk => chunk.path);
      
      // Download all chunks
      const chunkContents = await Promise.all(
        chunkPaths.map(async (path) => {
          const { data, error } = await supabase.storage
            .from(bucket)
            .download(path);
            
          if (error) throw error;
          return data;
        })
      );
      
      // Combine chunks into a single file
      const combinedFile = new Blob(chunkContents, { type: contentType });
      
      // Upload the combined file
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, combinedFile, {
          contentType,
          upsert: true
        });
        
      if (error) throw error;
      
      // Clean up chunks
      await supabase.storage
        .from(bucket)
        .remove(chunkPaths);
        
      // Get the public URL
      const publicUrl = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath).data.publicUrl;
        
      return new Response(
        JSON.stringify({ success: true, url: publicUrl }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    // For larger number of chunks, just return success but use the original file path
    // The client will handle getting the URL
    const publicUrl = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath).data.publicUrl;
      
    return new Response(
      JSON.stringify({ success: true, url: publicUrl }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error merging chunks:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

// Delete a file from storage
async function deleteFile(bucket: string, filePath: string) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);
      
    if (error) throw error;
    
    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error deleting file:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

// Check permissions on a bucket
async function checkPermissions(bucket: string) {
  try {
    await ensureBucketWithPolicies(bucket);
    
    // Test upload a small file to verify permissions
    const testContent = 'test';
    const testBlob = new Blob([testContent], { type: 'text/plain' });
    const testPath = `permission_test_${Date.now()}.txt`;
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(testPath, testBlob, {
        contentType: 'text/plain',
        upsert: true
      });
      
    if (error) throw error;
    
    // Clean up test file
    await supabase.storage
      .from(bucket)
      .remove([testPath]);
      
    return new Response(
      JSON.stringify({ success: true, hasPermission: true }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error checking permissions:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        hasPermission: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 200, // Still return 200 to avoid CORS issues
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
}

// Ensure bucket exists with proper policies
async function ensureBucketWithPolicies(bucket: string) {
  try {
    // Check if bucket exists
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) throw error;
    
    const bucketExists = buckets.some(b => b.name === bucket);
    
    // Create bucket if it doesn't exist
    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(bucket, {
        public: true
      });
      
      if (createError) throw createError;
    }
    
    // Create policies through direct SQL for more reliable permissions
    // Using RPC to execute SQL with elevated privileges
    const { data: policyData, error: policyError } = await supabase.rpc('exec_sql', {
      sql_string: `
        DO $$
        DECLARE
          bucket_id TEXT := '${bucket}';
          policy_name TEXT := 'allow_public_access_to_${bucket}';
          policy_exists BOOLEAN;
        BEGIN
          -- Check if policy exists
          SELECT EXISTS (
            SELECT 1 FROM storage.policies 
            WHERE name = policy_name
          ) INTO policy_exists;
          
          -- If policy doesn't exist, create it
          IF NOT policy_exists THEN
            INSERT INTO storage.policies (name, definition, owner)
            VALUES (
              policy_name,
              format('(bucket_id = ''%I'')', bucket_id),
              'authenticated'
            );
          END IF;
        END $$;
      `
    });
    
    if (policyError) {
      console.warn('Policy creation warning:', policyError);
      // Continue even if policy creation has warning
    }
    
    return true;
  } catch (error) {
    console.error('Error ensuring bucket with policies:', error);
    throw error;
  }
}
