
-- Function to execute arbitrary SQL for policy management
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

-- Grant permissions to use this function for anonymous users
GRANT EXECUTE ON FUNCTION public.exec_sql TO anon;
GRANT EXECUTE ON FUNCTION public.exec_sql TO authenticated;
GRANT EXECUTE ON FUNCTION public.exec_sql TO service_role;
