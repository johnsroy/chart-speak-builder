import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    // Create Supabase client with service role key for admin access
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
        JSON.stringify({ error: `Failed to get dataset: ${datasetError.message}`, success: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }
    
    if (action === 'delete') {
      // Delete related queries first to avoid foreign key errors
      try {
        const { error: queriesError } = await supabase
          .from('queries')
          .delete()
          .eq('dataset_id', dataset_id);
          
        if (queriesError) {
          console.warn('Warning when deleting related queries:', queriesError);
        }
      } catch (error) {
        console.warn('Exception during related queries deletion:', error);
      }
      
      // Delete file from storage, considering chunks for large files
      try {
        console.log(`Attempting to delete file from ${dataset.storage_type || 'datasets'} bucket: ${dataset.storage_path}`);
        
        if (dataset.is_large_file) {
          // For chunked files, we need to list all chunks and delete them
          const { data: files } = await supabase.storage
            .from(dataset.storage_type || 'datasets')
            .list(`uploads/${dataset.user_id}`, {
              search: dataset.storage_path.split('/').pop() || ''
            });
            
          if (files && files.length > 0) {
            const chunksToDelete = files
              .filter(file => file.name.startsWith(dataset.storage_path.split('/').pop() || ''))
              .map(file => `uploads/${dataset.user_id}/${file.name}`);
              
            console.log(`Deleting ${chunksToDelete.length} chunks for large file`);
            
            const { error: storageError } = await supabase.storage
              .from(dataset.storage_type || 'datasets')
              .remove(chunksToDelete);
              
            if (storageError) {
              console.error('Error deleting chunks from storage:', storageError);
            }
          }
        } else {
          // For regular files, just delete the single file
          const { error: storageError } = await supabase.storage
            .from(dataset.storage_type || 'datasets')
            .remove([dataset.storage_path]);
            
          if (storageError) {
            console.error('Error deleting from storage:', storageError);
          }
        }
      } catch (error) {
        console.warn('Exception during storage deletion:', error);
      }
      
      // Delete from database
      const { error: deleteError } = await supabase
        .from('datasets')
        .delete()
        .eq('id', dataset_id);
        
      if (deleteError) {
        console.error('Error deleting from database:', deleteError);
        return new Response(
          JSON.stringify({ error: `Database deletion failed: ${deleteError.message}`, success: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      
      return new Response(
        JSON.stringify({ success: true, message: "Dataset deleted successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    if (action === 'preview' || action === 'load') {
      const limit = requestData.limit || (action === 'preview' ? 1000 : 10000);
      console.log(`Loading ${action === 'preview' ? 'preview' : 'full data'} with limit: ${limit}`);
      
      try {
        // Check for large files first
        if (dataset.is_large_file) {
          console.log("Processing large file with chunked storage");
          
          // For large files, try to use the preview/cache data first
          if (dataset.dataset_cache_key || dataset.preview_key) {
            try {
              // Use cached dataset if available
              const cachedKey = dataset.dataset_cache_key || dataset.preview_key;
              console.log(`Trying to use cached data with key: ${cachedKey}`);
              
              if (dataset.column_schema) {
                // Return preview with schema for large files
                return new Response(
                  JSON.stringify({
                    message: "Using cached preview for large dataset",
                    schema: dataset.column_schema,
                    count: limit,
                    success: true,
                    is_large_file: true,
                    sample_data: true
                  }),
                  { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
              }
            } catch (cacheError) {
              console.warn("Failed to get cached data:", cacheError);
            }
          }
          
          // For now, generate sample data based on schema as fallback
          const sampleData = generateSampleData(dataset.file_name, dataset.column_schema, limit);
          
          return new Response(
            JSON.stringify({
              data: sampleData,
              schema: dataset.column_schema || inferSchema(sampleData[0] || {}),
              count: sampleData.length,
              success: true,
              synthetic: true,
              is_large_file: true
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // If we have a storage path, try to download and process the file
        if (dataset.storage_path && dataset.storage_type) {
          console.log(`Attempting to download from ${dataset.storage_type} bucket: ${dataset.storage_path}`);
          
          const { data: fileData, error: storageError } = await supabase
            .storage
            .from(dataset.storage_type)
            .download(dataset.storage_path);
            
          if (storageError) {
            console.error('Error downloading file:', storageError);
          } else {
            // Process CSV file
            const text = await fileData.text();
            const lines = text.trim().split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            
            const data = [];
            const maxLines = Math.min(lines.length, limit + 1); // +1 because of headers
            
            for (let i = 1; i < maxLines; i++) {
              if (!lines[i].trim()) continue;
              
              const values = lines[i].split(',');
              const row: Record<string, any> = {};
              
              headers.forEach((header, index) => {
                let value = values[index]?.trim() || '';
                
                // Try to convert numeric values
                if (!isNaN(+value) && value !== '') {
                  row[header] = +value;
                } else {
                  row[header] = value;
                }
              });
              
              data.push(row);
            }
            
            // Update dataset with row count if not set
            if (!dataset.row_count || dataset.row_count === 0) {
              await supabase
                .from('datasets')
                .update({ row_count: lines.length - 1 })
                .eq('id', dataset_id);
            }
            
            return new Response(
              JSON.stringify({
                data,
                schema: dataset.column_schema || inferSchema(data[0] || {}),
                count: data.length,
                success: true
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
        
        // If we couldn't get the file, try to check if we have a preview file
        if (dataset.preview_key) {
          try {
            // For preview key stored in session storage, we'd need a different approach
            // Since edge functions can't access browser's session storage
            console.log("Preview key available but can't be accessed directly by edge function");
          } catch (previewErr) {
            console.warn('Error loading preview file:', previewErr);
          }
        }
        
        // Generate sample data as a last resort
        console.log("Generating sample data based on filename or schema");
        const sampleData = generateSampleData(dataset.file_name, dataset.column_schema);
        
        return new Response(
          JSON.stringify({
            data: sampleData,
            schema: dataset.column_schema || inferSchema(sampleData[0] || {}),
            count: sampleData.length,
            success: true,
            synthetic: true
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (error) {
        console.error('Error processing dataset:', error);
        return new Response(
          JSON.stringify({ 
            error: `Failed to process dataset: ${error.message || 'Unknown error'}`,
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
      JSON.stringify({ error: error.message || "Unknown error", success: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Helper function to infer schema from data
function inferSchema(sample: Record<string, any>) {
  const schema: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(sample)) {
    if (typeof value === 'number') {
      schema[key] = 'number';
    } else if (typeof value === 'boolean') {
      schema[key] = 'boolean';
    } else if (typeof value === 'string') {
      // Try to detect dates in ISO format
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

// Generate sample data based on file name and schema
function generateSampleData(fileName: string, schema?: Record<string, string> | null, count: number = 100) {
  const lowerFileName = fileName.toLowerCase();
  const data = [];
  
  // If this looks like an electric vehicle dataset
  if (lowerFileName.includes('electric') || lowerFileName.includes('vehicle') || lowerFileName.includes('car')) {
    for (let i = 0; i < count; i++) {
      data.push({
        'VIN (1-10)': `SAMPLE${i}${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        'County': ['King', 'Pierce', 'Snohomish', 'Thurston', 'Clark', 'Spokane', 'Whatcom', 'Kitsap', 'Benton', 'Yakima'][i % 10],
        'City': ['Seattle', 'Bellevue', 'Tacoma', 'Olympia', 'Vancouver', 'Spokane', 'Bellingham', 'Bremerton', 'Kennewick', 'Yakima'][i % 10],
        'State': ['WA', 'OR', 'CA', 'ID', 'NY', 'FL', 'TX', 'OH', 'PA', 'IL'][i % 10],
        'Postal Code': 90000 + Math.floor(Math.random() * 10000),
        'Model Year': 2014 + (i % 10),
        'Make': ['Tesla', 'Nissan', 'Chevrolet', 'BMW', 'Ford', 'Hyundai', 'Toyota', 'Audi', 'Kia', 'Rivian'][i % 10], 
        'Model': [
          'Model 3', 'Model Y', 'Model S', 'Model X', 'Leaf', 'Bolt EV', 'i3', 
          'Mustang Mach-E', 'Ioniq 5', 'Prius Prime', 'e-tron', 'EV6', 'R1T'
        ][i % 13],
        'Electric Vehicle Type': i % 3 === 0 ? 'Plug-in Hybrid Electric Vehicle (PHEV)' : 'Battery Electric Vehicle (BEV)',
        'Clean Alternative Fuel Vehicle (CAFV) Eligibility': i % 5 === 0 ? 'Not eligible due to low battery range' : 'Clean Alternative Fuel Vehicle Eligible',
        'Electric Range': 80 + Math.floor(Math.random() * 320),
        'Base MSRP': 30000 + Math.floor(Math.random() * 70000),
        'Legislative District': Math.floor(Math.random() * 49) + 1,
        'DOL Vehicle ID': 100000 + i,
        'Vehicle Location': `POINT (-122.${Math.floor(Math.random() * 1000)} 47.${Math.floor(Math.random() * 1000)})`,
        'Electric Utility': ['Seattle City Light', 'Puget Sound Energy', 'Tacoma Power', 'Snohomish County PUD', 'Clark Public Utilities'][i % 5],
        'Census Tract 2020': Math.floor(Math.random() * 10000)
      });
    }
    
    return data;
  }
  
  // If schema is provided, use it to generate data
  if (schema && Object.keys(schema).length > 0) {
    const schemaKeys = Object.keys(schema);
    
    for (let i = 0; i < count; i++) {
      const row: Record<string, any> = {};
      
      schemaKeys.forEach(key => {
        const type = schema[key];
        
        switch (type) {
          case 'number':
            row[key] = Math.floor(Math.random() * 1000);
            break;
          case 'boolean':
            row[key] = Math.random() > 0.5;
            break;
          case 'date':
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 365));
            row[key] = date.toISOString().split('T')[0];
            break;
          case 'string':
          default:
            row[key] = `Sample ${key} ${i + 1}`;
            break;
        }
      });
      
      data.push(row);
    }
    
    return data;
  }
  
  // Default generic dataset
  for (let i = 0; i < count; i++) {
    data.push({
      'id': i + 1,
      'name': `Item ${i + 1}`,
      'category': ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'][i % 5],
      'value': Math.floor(Math.random() * 1000),
      'date': new Date(2023, i % 12, (i % 28) + 1).toISOString().split('T')[0]
    });
  }
  
  return data;
}
