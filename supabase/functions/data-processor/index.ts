
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
    
    const requestData = await req.json();
    const { action, dataset_id } = requestData;
    
    console.log(`Processing dataset ${dataset_id} with action: ${action}`);
    
    // Get the dataset metadata
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', dataset_id)
      .single();
      
    if (datasetError) {
      console.error('Error retrieving dataset:', datasetError);
      return new Response(
        JSON.stringify({ 
          error: `Failed to get dataset: ${datasetError.message}`,
          success: false 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }
    
    console.log(`Dataset found: ${dataset.name} Storage path: ${dataset.storage_path}`);
    
    if (action === 'delete') {
      // Delete file from storage
      try {
        const storageBucket = dataset.storage_type || 'datasets';
        console.log(`Attempting to delete file from ${storageBucket} bucket: ${dataset.storage_path}`);
        
        const { error: storageError } = await supabase.storage
          .from(storageBucket)
          .remove([dataset.storage_path]);
          
        if (storageError) {
          console.error('Error deleting from storage:', storageError);
          // Continue with deletion even if storage deletion fails
          // The record is more important than the file
        }
      } catch (storageError) {
        console.error('Exception during storage deletion:', storageError);
        // Continue with deletion even if storage deletion fails
      }
      
      // Delete database record
      const { error: deleteError } = await supabase
        .from('datasets')
        .delete()
        .eq('id', dataset_id);
        
      if (deleteError) {
        console.error('Error deleting from database:', deleteError);
        return new Response(
          JSON.stringify({ 
            error: `Database deletion failed: ${deleteError.message}`,
            success: false 
          }),
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
          .from(dataset.storage_type || 'datasets')
          .download(dataset.storage_path);
          
        if (fileError) {
          console.error('File download error:', fileError);
          return new Response(
            JSON.stringify({ 
              error: `Failed to download file: ${fileError.message}`,
              success: false  
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
          );
        }
        
        if (!fileData) {
          return new Response(
            JSON.stringify({ 
              error: "No file data returned from storage",
              success: false 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
          );
        }
        
        // Parse the file based on its type
        const text = await fileData.text();
        let data = [];
        
        if (dataset.file_name.endsWith('.csv')) {
          // Parse CSV - explicitly handle headers and data conversion
          try {
            const rows = text.split('\n');
            // Get headers from first row
            const headers = rows[0].split(',').map(h => h.trim());
            
            // Process remaining rows
            for (let i = 1; i < rows.length; i++) {
              if (!rows[i].trim()) continue;
              
              // Split by comma, but handle quoted values correctly
              const values = parseCSVLine(rows[i]);
              if (values.length !== headers.length) {
                console.warn(`Row ${i} has ${values.length} columns but headers has ${headers.length}`);
                continue;
              }
              
              const row: Record<string, any> = {};
              headers.forEach((header, idx) => {
                const value = values[idx] || '';
                
                // Try to convert to appropriate type
                if (value === '' || value === 'null' || value === 'undefined') {
                  row[header] = null;
                } else if (!isNaN(Number(value))) {
                  row[header] = Number(value);
                } else if (value.toLowerCase() === 'true') {
                  row[header] = true;
                } else if (value.toLowerCase() === 'false') {
                  row[header] = false;
                } else {
                  row[header] = value;
                }
              });
              
              data.push(row);
              
              // Limit to first 100 rows for preview
              if (data.length >= 100) break;
            }
          } catch (csvError) {
            console.error('CSV parsing error:', csvError);
            // Fall back to simpler parsing
            try {
              const parsedData = csvParse(text, { 
                skipFirstRow: false, 
                columns: true 
              });
              
              data = parsedData.slice(0, 100); // Limit to first 100 rows
            } catch (fallbackError) {
              console.error('Fallback CSV parsing also failed:', fallbackError);
              return new Response(
                JSON.stringify({ 
                  error: `CSV parsing failed: ${fallbackError.message}`,
                  success: false 
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
              );
            }
          }
        } else if (dataset.file_name.endsWith('.json')) {
          // Parse JSON
          try {
            const parsedData = JSON.parse(text);
            data = Array.isArray(parsedData) ? parsedData.slice(0, 100) : [parsedData];
          } catch (jsonError) {
            console.error('JSON parsing error:', jsonError);
            return new Response(
              JSON.stringify({ 
                error: `JSON parsing failed: ${jsonError.message}`,
                success: false 
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
            );
          }
        } else {
          // For unsupported formats
          return new Response(
            JSON.stringify({ 
              error: `Unsupported file format: ${dataset.file_name}`,
              success: false 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
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
          const { error: updateError } = await supabase
            .from('datasets')
            .update({ column_schema: schema })
            .eq('id', dataset_id);
            
          if (updateError) {
            console.error('Error updating schema:', updateError);
          } else {
            console.log('Successfully updated column schema:', schema);
            dataset.column_schema = schema;
          }
        }
        
        // Return preview data and schema
        return new Response(
          JSON.stringify({
            data: data,
            schema: dataset.column_schema || inferSchema(data[0] || {}),
            count: data.length,
            success: true
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error('Error processing file:', error);
        
        return new Response(
          JSON.stringify({
            error: `Error processing file: ${error.message}`,
            success: false
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }
    
    return new Response(
      JSON.stringify({ error: "Invalid action specified", success: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
    
  } catch (error) {
    console.error("Error in data-processor function:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Unknown error occurred",
        success: false
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Helper function to parse CSV line with quotes properly
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let currentValue = '';
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (i + 1 < line.length && line[i + 1] === '"') {
        // Double quotes inside quotes - escape
        currentValue += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  
  // Add the last value
  result.push(currentValue.trim());
  return result;
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
