
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { parse as csvParse } from "https://deno.land/std@0.181.0/csv/parse.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    // Create Supabase client with the service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceRole);
    
    const { action, dataset_id } = await req.json();
    
    console.log(`Processing dataset ${dataset_id} with action: ${action}`);
    
    // Get the dataset metadata
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', dataset_id)
      .single();
      
    if (datasetError) {
      return new Response(
        JSON.stringify({ error: datasetError.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    console.log(`Dataset found: ${dataset.name} Storage path: ${dataset.storage_path}`);
    
    if (action === 'delete') {
      // Delete file from storage
      try {
        const { error: storageError } = await supabase
          .storage
          .from(dataset.storage_type === 'local' ? 'datasets' : dataset.storage_type)
          .remove([dataset.storage_path]);
          
        if (storageError) {
          console.error('Error deleting from storage:', storageError);
        }
      } catch (storageError) {
        console.error('Exception during storage deletion:', storageError);
      }
      
      // Delete database record
      const { error: deleteError } = await supabase
        .from('datasets')
        .delete()
        .eq('id', dataset_id);
        
      if (deleteError) {
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      
      return new Response(
        JSON.stringify({ success: true, message: "Dataset deleted successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (action === 'preview') {
      try {
        // Download the dataset file
        const { data: fileData, error: fileError } = await supabase
          .storage
          .from(dataset.storage_type === 'local' ? 'datasets' : dataset.storage_type)
          .download(dataset.storage_path);
          
        if (fileError) {
          console.error('File download error:', fileError);
          throw fileError;
        }
        
        if (!fileData) {
          throw new Error("No file data returned from storage");
        }
        
        // Parse the file based on its type
        const text = await fileData.text();
        let data = [];
        
        if (dataset.file_name.endsWith('.csv')) {
          // Parse CSV
          const parsedData = csvParse(text, { 
            skipFirstRow: true, 
            columns: true 
          });
          
          data = parsedData.slice(0, 100); // Limit to first 100 rows
        } else if (dataset.file_name.endsWith('.json')) {
          // Parse JSON
          const parsedData = JSON.parse(text);
          data = Array.isArray(parsedData) ? parsedData.slice(0, 100) : [parsedData];
        } else {
          throw new Error("Unsupported file format");
        }
        
        // Extract column schema if not already available
        if (!dataset.column_schema || Object.keys(dataset.column_schema).length === 0) {
          const sampleRow = data[0] || {};
          const schema: Record<string, string> = {};
          
          for (const [key, value] of Object.entries(sampleRow)) {
            if (typeof value === 'number') {
              schema[key] = 'number';
            } else if (typeof value === 'boolean') {
              schema[key] = 'boolean';
            } else if (typeof value === 'string') {
              // Check if it's a date
              if (!isNaN(Date.parse(value as string)) &&
                  String(value).match(/^\d{4}-\d{2}-\d{2}/)) {
                schema[key] = 'date';
              } else {
                schema[key] = 'string';
              }
            } else if (value === null) {
              schema[key] = 'unknown';
            } else {
              schema[key] = 'object';
            }
          }
          
          // Update the dataset with the inferred schema
          await supabase
            .from('datasets')
            .update({ column_schema: schema })
            .eq('id', dataset_id);
            
          dataset.column_schema = schema;
        }
        
        // Return preview data and schema
        return new Response(
          JSON.stringify({
            data: data,
            schema: dataset.column_schema,
            count: data.length
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error('Error processing file:', error);
        
        // Generate sample data as fallback
        const sampleData = generateSampleData(dataset.name || 'Sample');
        
        return new Response(
          JSON.stringify({
            data: sampleData,
            schema: inferSchema(sampleData[0] || {}),
            count: sampleData.length,
            isFallback: true
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }
    
    return new Response(
      JSON.stringify({ error: "Invalid action specified" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
    
  } catch (error) {
    console.error("Error in data-processor function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error occurred" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Helper function to generate sample data
function generateSampleData(datasetName: string) {
  const categories = ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'];
  const years = [2020, 2021, 2022, 2023, 2024];
  const data = [];
  
  for (const category of categories) {
    for (const year of years) {
      data.push({
        Category: category,
        Year: year,
        Value: Math.floor(Math.random() * 1000),
        Revenue: Math.floor(Math.random() * 10000) / 100,
        Count: Math.floor(Math.random() * 100)
      });
    }
  }
  
  return data;
}

// Helper function to infer schema from data
function inferSchema(sample: Record<string, any>) {
  const schema: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(sample)) {
    if (typeof value === 'number') {
      schema[key] = 'number';
    } else if (typeof value === 'boolean') {
      schema[key] = 'boolean';
    } else if (typeof value === 'string') {
      if (!isNaN(Date.parse(value)) && String(value).match(/^\d{4}-\d{2}-\d{2}/)) {
        schema[key] = 'date';
      } else {
        schema[key] = 'string';
      }
    } else if (value === null) {
      schema[key] = 'unknown';
    } else {
      schema[key] = 'object';
    }
  }
  
  return schema;
}
