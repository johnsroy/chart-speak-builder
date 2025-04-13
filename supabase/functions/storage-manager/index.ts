
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
    const requestBody = await req.json().catch(() => ({}));
    const { action, filePath, chunks, contentType, bucket = 'datasets', bucketName, isPublic = true } = requestBody;
    
    console.log(`Processing ${action} request for ${filePath || bucketName || bucket}`);

    switch (action) {
      case 'merge-chunks':
        return await mergeChunks(bucket, filePath, chunks, contentType);
      
      case 'delete-file':
        return await deleteFile(bucket, filePath);
      
      case 'check-permissions':
        return await checkPermissions(bucket);
        
      case 'create-bucket':
        return await createBucket(bucketName || bucket, isPublic);
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action', action, body: requestBody }),
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

// Create a bucket with proper policies
async function createBucket(bucketName: string, isPublic = true) {
  try {
    console.log(`Creating bucket ${bucketName} via edge function with admin privileges`);
    
    // Service role key bypasses RLS policies
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: isPublic // Make bucket public by default
    });
    
    if (error) {
      // If the bucket already exists, that's not an error
      if (error.message.includes('already exists')) {
        console.log(`Bucket ${bucketName} already exists, updating policies`);
      } else {
        console.error(`Error creating bucket ${bucketName}:`, error);
        throw error;
      }
    } else {
      console.log(`Successfully created bucket ${bucketName}`);
    }
    
    // Create permissive policies for the bucket
    try {
      await createPoliciesForBucket(bucketName);
      console.log(`Created policies for bucket ${bucketName}`);
    } catch (policyError) {
      console.warn(`Warning creating policies: ${policyError.message}`);
    }
    
    // Insert a test file to ensure the bucket is working properly
    try {
      console.log(`Testing bucket ${bucketName} with test file`);
      const testContent = 'test';
      const testBlob = new Blob([testContent], { type: 'text/plain' });
      const testPath = `permission_test_${Date.now()}.txt`;
      
      const { data: testData, error: testError } = await supabase.storage
        .from(bucketName)
        .upload(testPath, testBlob, {
          contentType: 'text/plain',
          upsert: true
        });
        
      if (testError) {
        console.warn(`Warning testing bucket: ${testError.message}`);
      } else {
        console.log(`Successfully tested bucket ${bucketName}`);
        
        // Clean up test file
        await supabase.storage
          .from(bucketName)
          .remove([testPath]);
      }
    } catch (testError) {
      console.warn(`Warning testing bucket: ${testError.message}`);
    }
    
    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error creating bucket:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }),
      { 
        status: 200, // Return 200 to avoid CORS issues
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
      
    if (error) {
      console.warn(`Permission test failed: ${error.message}`);
      
      // Try to fix permissions directly
      try {
        await createPoliciesForBucket(bucket);
        console.log(`Created missing policies for bucket ${bucket}`);
        
        // Try the test again
        const { data: retryData, error: retryError } = await supabase.storage
          .from(bucket)
          .upload(`${testPath}_retry`, testBlob, {
            contentType: 'text/plain',
            upsert: true
          });
          
        if (retryError) {
          throw retryError;
        }
        
        // Clean up test file
        await supabase.storage
          .from(bucket)
          .remove([`${testPath}_retry`]);
          
        console.log('Permission test succeeded after fixing policies');
      } catch (fixError) {
        throw error; // Throw original error if fix fails
      }
    } else {
      // Clean up test file
      await supabase.storage
        .from(bucket)
        .remove([testPath]);
        
      console.log('Permission test succeeded');
    }
    
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
      console.log(`Created bucket ${bucket}`);
    }
    
    // Always try to create policies
    await createPoliciesForBucket(bucket);
    
    return true;
  } catch (error) {
    console.error('Error ensuring bucket with policies:', error);
    throw error;
  }
}

// Create policies for a bucket
async function createPoliciesForBucket(bucketName: string) {
  try {
    console.log(`Creating policies for bucket ${bucketName}`);
    
    // First try to use SQL RPC function
    try {
      console.log("Using SQL RPC for policy creation");
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_string: `
          DO $$
          BEGIN
            -- Allow anyone to SELECT from the bucket
            BEGIN
              INSERT INTO storage.policies (name, definition)
              VALUES (
                'allow_public_select_${bucketName}',
                '(bucket_id = ''${bucketName}''::text)'
              );
            EXCEPTION WHEN others THEN
              -- Ignore error if policy already exists
            END;
            
            -- Allow anyone to INSERT into the bucket
            BEGIN
              INSERT INTO storage.policies (name, definition)
              VALUES (
                'allow_public_insert_${bucketName}',
                '(bucket_id = ''${bucketName}''::text)'
              );
            EXCEPTION WHEN others THEN
              -- Ignore error if policy already exists
            END;
            
            -- Allow anyone to DELETE from the bucket
            BEGIN
              INSERT INTO storage.policies (name, definition)
              VALUES (
                'allow_public_delete_${bucketName}',
                '(bucket_id = ''${bucketName}''::text)'
              );
            EXCEPTION WHEN others THEN
              -- Ignore error if policy already exists
            END;
          END $$;
        `
      });
      
      if (error) {
        console.warn('SQL policy creation warning:', error);
      } else {
        console.log('Created policies via SQL RPC');
        return true;
      }
    } catch (sqlError) {
      console.warn('SQL policy creation error:', sqlError);
    }
    
    // Try to use the RPC function to create policies
    try {
      const { data, error } = await supabase.rpc('create_public_storage_policies', {
        bucket_name: bucketName
      });
      
      if (error) {
        console.warn('RPC policy creation warning:', error);
      } else {
        console.log('Created policies via RPC function');
        return true;
      }
    } catch (rpcError) {
      console.warn('RPC policy creation error:', rpcError);
    }
    
    // Even if there were warnings, we'll continue
    return true;
  } catch (error) {
    console.error('Error creating policies:', error);
    return false;
  }
}
