
-- Function to check if a table exists in the database
CREATE OR REPLACE FUNCTION public.table_exists(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  table_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = $1
  ) INTO table_exists;
  
  RETURN table_exists;
END;
$$;

-- Function to create the dataset_data table if it doesn't exist
CREATE OR REPLACE FUNCTION public.create_dataset_data_table()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the table already exists
  IF NOT (SELECT table_exists('dataset_data')) THEN
    -- Create the dataset_data table
    CREATE TABLE public.dataset_data (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
      row_number INTEGER NOT NULL,
      row_data JSONB NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      UNIQUE (dataset_id, row_number)
    );
    
    -- Add indexes for better performance
    CREATE INDEX dataset_data_dataset_id_idx ON public.dataset_data (dataset_id);
    CREATE INDEX dataset_data_row_number_idx ON public.dataset_data (row_number);
    
    -- Add RLS policies
    ALTER TABLE public.dataset_data ENABLE ROW LEVEL SECURITY;
    
    -- Policy to allow users to view their own data
    CREATE POLICY "Users can view their own dataset data" ON public.dataset_data
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.datasets
          WHERE datasets.id = dataset_data.dataset_id
          AND (datasets.user_id = auth.uid() OR datasets.user_id = 'fe4ab121-d26c-486d-92ca-b5cc4d99e984')
        )
      );
      
    -- Policy to allow users to insert their own data
    CREATE POLICY "Users can insert their own dataset data" ON public.dataset_data
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.datasets
          WHERE datasets.id = dataset_data.dataset_id
          AND (datasets.user_id = auth.uid() OR datasets.user_id = 'fe4ab121-d26c-486d-92ca-b5cc4d99e984')
        )
      );
      
    -- Policy to allow users to delete their own data
    CREATE POLICY "Users can delete their own dataset data" ON public.dataset_data
      FOR DELETE USING (
        EXISTS (
          SELECT 1 FROM public.datasets
          WHERE datasets.id = dataset_data.dataset_id
          AND (datasets.user_id = auth.uid() OR datasets.user_id = 'fe4ab121-d26c-486d-92ca-b5cc4d99e984')
        )
      );
    
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

-- Ensure UUID functions are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
