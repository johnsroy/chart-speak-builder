
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceRole);
    
    // Check if the dataset_data table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'dataset_data')
      .maybeSingle();
      
    if (checkError) {
      console.error('Error checking if table exists:', checkError);
      throw new Error('Failed to check if table exists');
    }
    
    if (existingTable) {
      console.log('Table dataset_data already exists');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Table already exists',
        created: false
      }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
    
    // Create the dataset_data table
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql_string: `
        CREATE TABLE public.dataset_data (
          id SERIAL PRIMARY KEY,
          dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
          row_data JSONB NOT NULL,
          row_number INT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX idx_dataset_data_dataset_id ON public.dataset_data(dataset_id);
        
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
        
        ALTER TABLE public.dataset_data ENABLE ROW LEVEL SECURITY;
      `
    });
    
    if (createError) {
      console.error('Error creating table:', createError);
      throw new Error('Failed to create dataset_data table');
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Dataset_data table created successfully',
      created: true
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    console.error('Error:', error);
    
    return new Response(JSON.stringify({
      error: error.message || 'An unknown error occurred',
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }
});
