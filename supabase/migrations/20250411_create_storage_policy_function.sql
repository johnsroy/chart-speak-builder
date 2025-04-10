
-- Create a function to set up storage policies for buckets
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
    SELECT 1 FROM storage.policies 
    WHERE definition LIKE '%bucket_id = '''|| bucket_name ||'''%'
  ) INTO policy_exists;
  
  -- If policy doesn't exist, create it
  IF NOT policy_exists THEN
    -- Insert PUBLIC policies for all operations
    -- This allows anyone to read and authenticated users to write
    INSERT INTO storage.policies (name, definition)
    VALUES 
      ('allow_public_select_' || bucket_name, 'bucket_id = ''' || bucket_name || ''' AND auth.role() = ''anon'''),
      ('allow_public_insert_' || bucket_name, 'bucket_id = ''' || bucket_name || ''''),
      ('allow_public_update_' || bucket_name, 'bucket_id = ''' || bucket_name || ''''),
      ('allow_public_delete_' || bucket_name, 'bucket_id = ''' || bucket_name || '''');
  END IF;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating storage policy: %', SQLERRM;
    RETURN false;
END;
$$;
