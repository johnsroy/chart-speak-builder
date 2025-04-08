
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface QueryConfig {
  dataset_id: string;
  chart_type: string;
  measures: Array<{
    field: string;
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
  }>;
  dimensions: Array<{
    field: string;
  }>;
  filters?: Array<{
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'not_contains';
    value: any;
  }>;
  sort?: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;
  limit?: number;
}

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
    
    const { query_type, dataset_id, query_text, query_config } = await req.json();
    
    if (!dataset_id) {
      return new Response(
        JSON.stringify({ error: "Dataset ID is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
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
    
    let data;
    
    // First try to get data from dataset_data table
    console.log("Attempting to fetch data from dataset_data table");
    const { data: tableData, error: tableError } = await supabase
      .from('dataset_data')
      .select('*')
      .eq('dataset_id', dataset_id)
      .limit(10000); // Increased limit significantly
    
    if (!tableError && tableData && tableData.length > 0) {
      console.log(`Retrieved ${tableData.length} rows from dataset_data table`);
      data = tableData;
    } else {
      console.log("No data in dataset_data table or error occurred, falling back to storage");
      
      // Download the dataset file from storage as a backup approach
      const { data: fileData, error: fileError } = await supabase
        .storage
        .from('datasets')
        .download(dataset.storage_path);
        
      if (fileError) {
        return new Response(
          JSON.stringify({ error: fileError.message }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }
      
      // Parse the CSV data
      const text = await fileData.text();
      data = await parseCSV(text);
      console.log(`Parsed ${data.length} rows from CSV file`);
    }
    
    // Process data based on query type
    let result;
    if (query_type === 'sql') {
      // SQL queries would ideally be processed by a database, but for MVP we simulate it
      result = await processDataWithConfig(data, query_config);
    } 
    else if (query_type === 'natural_language') {
      // Convert NL query to structured config and process
      const config = await convertNLToQueryConfig(query_text, dataset);
      result = await processDataWithConfig(data, config);
    }
    else if (query_type === 'ui_builder') {
      // UI builder provides a structured config directly
      result = await processDataWithConfig(data, query_config);
    }
    
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing data transformation:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Helper function to parse CSV
async function parseCSV(text: string) {
  const lines = text.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = lines[i].split(',').map(v => v.trim());
    const row: Record<string, any> = {};
    
    headers.forEach((header, index) => {
      const value = values[index] || '';
      
      // Try to convert to number if possible
      const numValue = Number(value);
      row[header] = isNaN(numValue) ? value : numValue;
    });
    
    data.push(row);
  }
  
  return data;
}

// Process data based on query config
async function processDataWithConfig(data: any[], config: QueryConfig) {
  try {
    let processedData = [...data];
    
    // Apply filters
    if (config.filters && config.filters.length > 0) {
      processedData = processedData.filter(row => {
        return config.filters!.every(filter => {
          const value = row[filter.field];
          switch (filter.operator) {
            case 'eq': return value === filter.value;
            case 'neq': return value !== filter.value;
            case 'gt': return Number(value) > Number(filter.value);
            case 'lt': return Number(value) < Number(filter.value);
            case 'gte': return Number(value) >= Number(filter.value);
            case 'lte': return Number(value) <= Number(filter.value);
            case 'contains': return String(value).includes(String(filter.value));
            case 'not_contains': return !String(value).includes(String(filter.value));
            default: return true;
          }
        });
      });
    }
    
    // Group by dimensions and aggregate measures
    if (config.dimensions && config.dimensions.length > 0) {
      const groupedData = new Map();
      
      processedData.forEach(row => {
        // Create a key based on the dimension values
        const dimensionKey = config.dimensions.map(dim => row[dim.field]).join('|');
        
        if (!groupedData.has(dimensionKey)) {
          const newGroup = {
            // Add dimension fields
            ...config.dimensions.reduce((obj, dim) => ({
              ...obj,
              [dim.field]: row[dim.field]
            }), {}),
            // Initialize measure fields
            ...config.measures.reduce((obj, measure) => ({
              ...obj,
              [`${measure.aggregation}_${measure.field}`]: measure.aggregation === 'count' ? 1 : Number(row[measure.field]) || 0,
              [`${measure.field}_values`]: measure.aggregation === 'count' ? [1] : [Number(row[measure.field]) || 0]
            }), {})
          };
          groupedData.set(dimensionKey, newGroup);
        } else {
          const group = groupedData.get(dimensionKey);
          
          // Update measures
          config.measures.forEach(measure => {
            const value = measure.aggregation === 'count' ? 1 : Number(row[measure.field]) || 0;
            group[`${measure.field}_values`].push(value);
            
            if (measure.aggregation === 'count') {
              group[`${measure.aggregation}_${measure.field}`] += 1;
            } else if (measure.aggregation === 'sum') {
              group[`${measure.aggregation}_${measure.field}`] += value;
            }
            // We'll calculate avg, min, max after all data is processed
          });
        }
      });
      
      // Calculate final aggregations
      for (const group of groupedData.values()) {
        config.measures.forEach(measure => {
          const values = group[`${measure.field}_values`];
          if (measure.aggregation === 'avg') {
            group[`${measure.aggregation}_${measure.field}`] = values.reduce((sum: number, val: number) => sum + val, 0) / values.length;
          } else if (measure.aggregation === 'min') {
            group[`${measure.aggregation}_${measure.field}`] = Math.min(...values);
          } else if (measure.aggregation === 'max') {
            group[`${measure.aggregation}_${measure.field}`] = Math.max(...values);
          }
          
          // Remove temporary values array
          delete group[`${measure.field}_values`];
        });
      }
      
      processedData = Array.from(groupedData.values());
    }
    
    // Apply sorting
    if (config.sort && config.sort.length > 0) {
      processedData.sort((a, b) => {
        for (const sort of config.sort!) {
          const fieldA = a[sort.field];
          const fieldB = b[sort.field];
          
          if (fieldA < fieldB) return sort.direction === 'asc' ? -1 : 1;
          if (fieldA > fieldB) return sort.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    // Apply limit
    if (config.limit) {
      processedData = processedData.slice(0, config.limit);
    }
    
    // Determine columns (all unique keys from the result data)
    const columnSet = new Set<string>();
    processedData.forEach(row => {
      Object.keys(row).forEach(key => columnSet.add(key));
    });
    
    return {
      data: processedData,
      columns: Array.from(columnSet)
    };
  } catch (error) {
    console.error('Error processing data with config:', error);
    throw new Error(`Failed to process data: ${error.message}`);
  }
}

// Simple NL to query config conversion for MVP
async function convertNLToQueryConfig(nlQuery: string, dataset: any): Promise<QueryConfig> {
  // For MVP, this is a very simplified implementation
  // In a real app, this would be a much more sophisticated NLP/AI service
  
  // Default config
  const config: QueryConfig = {
    dataset_id: dataset.id,
    chart_type: 'bar',
    measures: [],
    dimensions: []
  };
  
  // Extract column names from dataset schema
  const columns = Object.keys(dataset.column_schema);
  
  // Simple keyword detection
  const nlQueryLower = nlQuery.toLowerCase();
  
  // Detect dimensions (typically categorical data)
  const dimensionKeywords = ['by', 'group by', 'grouped by', 'broken down by', 'split by'];
  for (const column of columns) {
    const columnLower = column.toLowerCase();
    
    // Check if column is mentioned in context of a dimension
    for (const keyword of dimensionKeywords) {
      if (nlQueryLower.includes(`${keyword} ${columnLower}`)) {
        config.dimensions.push({ field: column });
        break;
      }
    }
    
    // If no explicit dimension context but the column is mentioned
    // and the schema says it's a string/category, make it a dimension
    if (
      config.dimensions.length === 0 && 
      nlQueryLower.includes(columnLower) && 
      (dataset.column_schema[column] === 'string' || dataset.column_schema[column] === 'date')
    ) {
      config.dimensions.push({ field: column });
    }
  }
  
  // Detect measures (typically numeric data)
  const aggregationKeywords: Record<string, string[]> = {
    'sum': ['sum', 'total', 'add'],
    'avg': ['average', 'mean', 'avg'],
    'min': ['min', 'minimum', 'lowest'],
    'max': ['max', 'maximum', 'highest'],
    'count': ['count', 'number of', 'how many']
  };
  
  for (const column of columns) {
    const columnLower = column.toLowerCase();
    
    // Only consider numeric fields for measures (except count which works on any field)
    if (dataset.column_schema[column] === 'number' || dataset.column_schema[column] === 'integer') {
      let aggregationType = null;
      
      // Check which aggregation is mentioned for this column
      for (const [agg, keywords] of Object.entries(aggregationKeywords)) {
        for (const keyword of keywords) {
          if (nlQueryLower.includes(`${keyword} ${columnLower}`)) {
            aggregationType = agg;
            break;
          }
        }
        if (aggregationType) break;
      }
      
      // If column is mentioned but no specific aggregation, default to sum
      if (!aggregationType && nlQueryLower.includes(columnLower)) {
        aggregationType = 'sum';
      }
      
      if (aggregationType) {
        config.measures.push({
          field: column,
          aggregation: aggregationType as 'sum' | 'avg' | 'min' | 'max' | 'count'
        });
      }
    }
  }
  
  // If no measures detected, try to find any numeric column for count
  if (config.measures.length === 0) {
    for (const column of columns) {
      if (nlQueryLower.includes('count') || nlQueryLower.includes('how many')) {
        config.measures.push({ field: column, aggregation: 'count' });
        break;
      }
    }
  }
  
  // If still no measures, use the first numeric column as sum
  if (config.measures.length === 0) {
    for (const column of columns) {
      if (dataset.column_schema[column] === 'number' || dataset.column_schema[column] === 'integer') {
        config.measures.push({ field: column, aggregation: 'sum' });
        break;
      }
    }
  }
  
  // Detect chart type
  const chartTypeKeywords: Record<string, string[]> = {
    'bar': ['bar chart', 'bar graph', 'bars'],
    'line': ['line chart', 'line graph', 'trend', 'over time'],
    'pie': ['pie chart', 'pie graph', 'percentage', 'proportion'],
    'scatter': ['scatter plot', 'scatter chart', 'correlation']
  };
  
  for (const [chartType, keywords] of Object.entries(chartTypeKeywords)) {
    for (const keyword of keywords) {
      if (nlQueryLower.includes(keyword)) {
        config.chart_type = chartType;
        break;
      }
    }
  }
  
  return config;
}
