
-- Create a function to execute SQL with elevated privileges
CREATE OR REPLACE FUNCTION public.exec_sql(sql_string TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_string;
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error executing SQL: %', SQLERRM;
    RETURN false;
END;
$$;

-- Function to create public storage policies
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

-- Function to create all necessary storage buckets
CREATE OR REPLACE FUNCTION public.create_storage_buckets()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  bucket_exists boolean;
  bucket_names text[] := array['datasets', 'secure', 'cold_storage'];
  bucket_name text;
BEGIN
  FOREACH bucket_name IN ARRAY bucket_names
  LOOP
    -- Check if bucket exists
    SELECT EXISTS (
      SELECT 1 FROM storage.buckets 
      WHERE name = bucket_name
    ) INTO bucket_exists;
    
    -- Create bucket if it doesn't exist
    IF NOT bucket_exists THEN
      BEGIN
        INSERT INTO storage.buckets (id, name, public)
        VALUES (bucket_name, bucket_name, true);
        
        -- Create policies for the bucket
        PERFORM create_public_storage_policies(bucket_name);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creating bucket %: %', bucket_name, SQLERRM;
      END;
    END IF;
  END LOOP;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating storage buckets: %', SQLERRM;
    RETURN false;
END;
$$;

-- Enable RLS on storage.objects if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'storage'
    AND c.relname = 'objects'
    AND c.relrowsecurity = true
  ) THEN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
