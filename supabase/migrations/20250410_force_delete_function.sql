
-- Create a function to force delete queries for a dataset
CREATE OR REPLACE FUNCTION public.force_delete_queries(dataset_id_param UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    query_record RECORD;
BEGIN
    -- First, delete all visualizations for the dataset's queries
    FOR query_record IN SELECT id FROM public.queries WHERE dataset_id = dataset_id_param LOOP
        DELETE FROM public.visualizations WHERE query_id = query_record.id;
    END LOOP;
    
    -- Now delete all queries for the dataset
    DELETE FROM public.queries WHERE dataset_id = dataset_id_param;
END;
$$;
