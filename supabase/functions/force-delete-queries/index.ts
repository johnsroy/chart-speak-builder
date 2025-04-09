
// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://rehadpogugijylybwmoe.supabase.co';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request body
    const { dataset_id } = await req.json();

    if (!dataset_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing dataset_id parameter' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Force deleting queries for dataset: ${dataset_id}`);

    // First, get all visualizations that need to be deleted
    const { data: queries, error: queriesError } = await supabase
      .from('queries')
      .select('id')
      .eq('dataset_id', dataset_id);

    if (queriesError) {
      throw new Error(`Error fetching queries: ${queriesError.message}`);
    }

    // Delete visualizations that depend on these queries
    if (queries && queries.length > 0) {
      const queryIds = queries.map(q => q.id);

      // Delete visualizations first
      const { error: vizError } = await supabase
        .from('visualizations')
        .delete()
        .in('query_id', queryIds);

      if (vizError) {
        console.error(`Error deleting visualizations: ${vizError.message}`);
      } else {
        console.log(`Successfully deleted visualizations for ${queryIds.length} queries`);
      }

      // Delete queries one by one
      for (const queryId of queryIds) {
        const { error: deleteError } = await supabase
          .from('queries')
          .delete()
          .eq('id', queryId);

        if (deleteError) {
          console.error(`Error deleting query ${queryId}: ${deleteError.message}`);
        } else {
          console.log(`Successfully deleted query ${queryId}`);
        }

        // Add small delay between operations
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Final check
    const { count, error: countError } = await supabase
      .from('queries')
      .select('*', { count: 'exact', head: true })
      .eq('dataset_id', dataset_id);

    if (countError) {
      throw new Error(`Error verifying deletion: ${countError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Force delete operation completed. Remaining queries: ${count || 0}` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in force-delete-queries function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
