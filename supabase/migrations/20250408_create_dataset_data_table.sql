
-- Create a function to execute SQL dynamically (for use with edge functions)
CREATE OR REPLACE FUNCTION public.exec_sql(sql_string text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE sql_string;
END;
$$;

-- Create a function specifically for creating the dataset_data table
CREATE OR REPLACE FUNCTION public.create_dataset_data_table()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  table_exists boolean;
BEGIN
  -- Check if table already exists
  SELECT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'dataset_data'
  ) INTO table_exists;
  
  -- If table doesn't exist, create it
  IF NOT table_exists THEN
    -- Create the table
    CREATE TABLE IF NOT EXISTS public.dataset_data (
      id SERIAL PRIMARY KEY,
      dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
      row_data JSONB NOT NULL,
      row_number INT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    -- Create index
    CREATE INDEX IF NOT EXISTS idx_dataset_data_dataset_id ON public.dataset_data(dataset_id);
    
    -- Setup RLS policies
    CREATE POLICY "Users can select their own dataset data"
    ON public.dataset_data FOR SELECT
    USING (
      dataset_id IN (SELECT id FROM public.datasets WHERE user_id = auth.uid())
    );
    
    CREATE POLICY "Users can insert their own dataset data"
    ON public.dataset_data FOR INSERT
    WITH CHECK (
      dataset_id IN (SELECT id FROM public.datasets WHERE user_id = auth.uid())
    );
    
    -- Enable RLS
    ALTER TABLE public.dataset_data ENABLE ROW LEVEL SECURITY;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;
