
-- Add Row Level Security (RLS) to ensure datasets are accessible
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;

-- Create policy that allows anyone to read datasets
CREATE POLICY "Allow anyone to read datasets" 
ON public.datasets 
FOR SELECT 
USING (true);

-- Create policy that allows anyone to insert datasets
CREATE POLICY "Allow anyone to insert datasets" 
ON public.datasets 
FOR INSERT 
WITH CHECK (true);

-- Create policy that allows anyone to update datasets
CREATE POLICY "Allow anyone to update datasets" 
ON public.datasets 
FOR UPDATE 
USING (true);

-- Create policy that allows anyone to delete datasets
CREATE POLICY "Allow anyone to delete datasets" 
ON public.datasets 
FOR DELETE 
USING (true);

-- Update schema for existing datasets if needed
UPDATE public.datasets 
SET column_schema = '{"Category":"string","Year":"number","Value":"number","Revenue":"number","Count":"number"}' 
WHERE column_schema IS NULL OR column_schema = '{}'::jsonb;
