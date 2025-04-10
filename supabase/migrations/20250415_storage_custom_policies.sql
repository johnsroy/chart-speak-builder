
-- Function to create a custom storage policy
CREATE OR REPLACE FUNCTION public.create_storage_policy_custom(
  p_name TEXT,
  p_operation TEXT,
  p_definition TEXT,
  p_check TEXT
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  policy_exists boolean;
  sql_command text;
BEGIN
  -- Check if the policy already exists
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE policyname = p_name AND tablename = 'objects' AND schemaname = 'storage'
  ) INTO policy_exists;
  
  -- If policy exists, drop it first
  IF policy_exists THEN
    sql_command := 'DROP POLICY IF EXISTS "' || p_name || '" ON storage.objects;';
    EXECUTE sql_command;
  END IF;
  
  -- Create the policy with the provided parameters
  sql_command := 'CREATE POLICY "' || p_name || '" ON storage.objects FOR ' || p_operation;
  
  -- Add USING clause for all operations
  sql_command := sql_command || ' USING (' || p_definition || ')';
  
  -- Add WITH CHECK clause for INSERT and UPDATE
  IF p_operation IN ('INSERT', 'UPDATE') THEN
    sql_command := sql_command || ' WITH CHECK (' || p_check || ')';
  END IF;
  
  sql_command := sql_command || ';';
  
  BEGIN
    EXECUTE sql_command;
    RETURN true;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Error creating policy: %', SQLERRM;
      RETURN false;
  END;
END;
$$;

-- Function to execute arbitrary SQL for policy management
CREATE OR REPLACE FUNCTION public.execute_sql(sql_command TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_command;
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error executing SQL: %', SQLERRM;
    RETURN false;
END;
$$;

-- Update the existing storage policy function to be more robust
CREATE OR REPLACE FUNCTION public.create_storage_policy(bucket_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  policy_exists boolean;
BEGIN
  -- Check if any policy exists for this bucket
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND schemaname = 'storage'
    AND definition LIKE '%bucket_id = '''|| bucket_name ||'''%'
  ) INTO policy_exists;
  
  -- If policy doesn't exist, create it
  IF NOT policy_exists THEN
    -- Insert PUBLIC policies for all operations
    EXECUTE 'CREATE POLICY "allow_public_select_' || bucket_name || '" ON storage.objects 
             FOR SELECT USING (bucket_id = ''' || bucket_name || ''')';
             
    EXECUTE 'CREATE POLICY "allow_public_insert_' || bucket_name || '" ON storage.objects 
             FOR INSERT WITH CHECK (bucket_id = ''' || bucket_name || ''')';
             
    EXECUTE 'CREATE POLICY "allow_public_update_' || bucket_name || '" ON storage.objects 
             FOR UPDATE USING (bucket_id = ''' || bucket_name || ''')
             WITH CHECK (bucket_id = ''' || bucket_name || ''')';
             
    EXECUTE 'CREATE POLICY "allow_public_delete_' || bucket_name || '" ON storage.objects 
             FOR DELETE USING (bucket_id = ''' || bucket_name || ''')';
  END IF;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating storage policy: %', SQLERRM;
    RETURN false;
END;
$$;

-- Create a public function for creating storage buckets directly
CREATE OR REPLACE FUNCTION public.create_public_storage_policies(bucket_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create public policies for the bucket with minimal restrictions
  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "allow_public_select_' || bucket_name || '" ON storage.objects';
    EXECUTE 'CREATE POLICY "allow_public_select_' || bucket_name || '" ON storage.objects 
             FOR SELECT USING (bucket_id = ''' || bucket_name || ''')';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating SELECT policy: %', SQLERRM;
  END;

  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "allow_public_insert_' || bucket_name || '" ON storage.objects';  
    EXECUTE 'CREATE POLICY "allow_public_insert_' || bucket_name || '" ON storage.objects 
             FOR INSERT WITH CHECK (bucket_id = ''' || bucket_name || ''')';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating INSERT policy: %', SQLERRM;
  END;

  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "allow_public_update_' || bucket_name || '" ON storage.objects';
    EXECUTE 'CREATE POLICY "allow_public_update_' || bucket_name || '" ON storage.objects 
             FOR UPDATE USING (bucket_id = ''' || bucket_name || ''')
             WITH CHECK (bucket_id = ''' || bucket_name || ''')';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating UPDATE policy: %', SQLERRM;
  END;

  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "allow_public_delete_' || bucket_name || '" ON storage.objects';
    EXECUTE 'CREATE POLICY "allow_public_delete_' || bucket_name || '" ON storage.objects 
             FOR DELETE USING (bucket_id = ''' || bucket_name || ''')';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error creating DELETE policy: %', SQLERRM;
  END;
  
  RETURN true;
END;
$$;
