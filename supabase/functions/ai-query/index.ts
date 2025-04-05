import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Define our result interface
interface QueryResult {
  data: any[];
  explanation: string;
  chartType: string;
  chartConfig: {
    title: string;
    xAxisTitle: string;
    yAxisTitle: string;
    colorScheme?: string[];
  };
}

// Color schemes for visualizations
const COLOR_SCHEMES = {
  purple: ['#9b87f5', '#7E69AB', '#6E59A5', '#D6BCFA', '#E5DEFF'],
  gradient: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'],
  vibrant: ['#8B5CF6', '#D946EF', '#F97316', '#0EA5E9', '#22C55E'],
  pastel: ['#FEC6A1', '#FEF7CD', '#F2FCE2', '#D3E4FD', '#FFDEE2'],
  dark: ['#1A1F2C', '#403E43', '#221F26', '#333333', '#555555']
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create a Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse request payload
    const { datasetId, query, modelType = 'openai' } = await req.json();

    // Get dataset information
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', datasetId)
      .single();

    if (datasetError) {
      return new Response(
        JSON.stringify({ error: `Dataset not found: ${datasetError.message}` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download the dataset file
    const { data: fileData, error: fileError } = await supabase
      .storage
      .from('datasets')
      .download(dataset.storage_path);

    if (fileError) {
      return new Response(
        JSON.stringify({ error: `Failed to download dataset file: ${fileError.message}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse CSV data
    const text = await fileData.text();
    const parsedData = await parseCSV(text);

    // Determine the best visualization based on the query
    const result = await processDataWithAI(parsedData, query, dataset, modelType);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing AI query:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Parse CSV data with proper type conversion
async function parseCSV(text: string) {
  const lines = text.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    // Handle quoted values with commas inside them
    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue);
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    // Add the last value
    values.push(currentValue);
    
    const row: Record<string, any> = {};
    
    headers.forEach((header, index) => {
      const value = index < values.length ? values[index].trim() : '';
      
      // Try to intelligently convert types
      if (value === '') {
        row[header] = null;
      } else if (value.toLowerCase() === 'true') {
        row[header] = true;
      } else if (value.toLowerCase() === 'false') {
        row[header] = false;
      } else if (!isNaN(Date.parse(value)) && 
                 (value.includes('-') || value.includes('/')) && 
                 value.length >= 8) {
        // This looks like a date
        row[header] = value;
      } else if (!isNaN(Number(value))) {
        row[header] = Number(value);
      } else {
        row[header] = value.replace(/^"|"$/g, ''); // Remove surrounding quotes
      }
    });
    
    data.push(row);
  }
  
  return data;
}

// Simple AI-inspired data processing for visualization
async function processDataWithAI(data: any[], query: string, dataset: any, modelType: string): Promise<QueryResult> {
  // For MVP, we'll use a rules-based approach since we don't have a real AI model integration yet
  const queryLower = query.toLowerCase();
  const schema = dataset.column_schema;
  
  // Find numeric and categorical columns
  const numericColumns: string[] = [];
  const categoricalColumns: string[] = [];
  const dateColumns: string[] = [];
  
  Object.entries(schema).forEach(([column, type]) => {
    if (type === 'number' || type === 'integer') {
      numericColumns.push(column);
    } else if (type === 'date') {
      dateColumns.push(column);
      categoricalColumns.push(column);
    } else {
      categoricalColumns.push(column);
    }
  });
  
  // Determine chart type from query
  let chartType = 'bar'; // Default
  if (queryLower.includes('distribution') || 
      queryLower.includes('proportion') || 
      queryLower.includes('percentage') || 
      queryLower.includes('pie')) {
    chartType = 'pie';
  } else if (queryLower.includes('trend') || 
             queryLower.includes('over time') ||
             queryLower.includes('line') || 
             dateColumns.some(col => queryLower.includes(col.toLowerCase()))) {
    chartType = 'line';
  } else if (queryLower.includes('scatter') || 
             queryLower.includes('correlation') || 
             queryLower.includes('relationship')) {
    chartType = 'scatter';
  }
  
  // Try to find dimensions and measures from the query
  let dimensionColumn: string | null = null;
  let measureColumn: string | null = null;
  
  // Look for categorical columns mentioned in the query
  for (const column of categoricalColumns) {
    if (queryLower.includes(column.toLowerCase())) {
      dimensionColumn = column;
      break;
    }
  }
  
  // Look for numeric columns mentioned in the query
  for (const column of numericColumns) {
    if (queryLower.includes(column.toLowerCase())) {
      measureColumn = column;
      break;
    }
  }
  
  // If no dimension found, pick the most relevant one
  if (!dimensionColumn) {
    if (chartType === 'line' && dateColumns.length > 0) {
      // For line charts, prefer date columns
      dimensionColumn = dateColumns[0];
    } else {
      // Otherwise use the first categorical column
      dimensionColumn = categoricalColumns[0];
    }
  }
  
  // If no measure found, pick the first numeric column
  if (!measureColumn && numericColumns.length > 0) {
    measureColumn = numericColumns[0];
  }
  
  // If we have no measure but have dimension, use count as measure
  if (!measureColumn && dimensionColumn) {
    measureColumn = 'count';
  }
  
  // Process data based on the selected dimension and measure
  let processedData: any[] = [];
  
  if (dimensionColumn && measureColumn) {
    if (measureColumn === 'count') {
      // Count by dimension
      const counts: Record<string, number> = {};
      data.forEach(row => {
        const dimValue = String(row[dimensionColumn!] || 'Unknown');
        counts[dimValue] = (counts[dimValue] || 0) + 1;
      });
      
      processedData = Object.entries(counts).map(([dimension, count]) => ({
        [dimensionColumn!]: dimension,
        count: count
      }));
      
      measureColumn = 'count';
    } else {
      // Aggregate measure by dimension
      const aggregates: Record<string, number[]> = {};
      
      data.forEach(row => {
        const dimValue = String(row[dimensionColumn!] || 'Unknown');
        const measure = Number(row[measureColumn!]) || 0;
        
        if (!aggregates[dimValue]) {
          aggregates[dimValue] = [];
        }
        
        aggregates[dimValue].push(measure);
      });
      
      // Calculate averages and create data points
      processedData = Object.entries(aggregates).map(([dimension, values]) => {
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        
        return {
          [dimensionColumn!]: dimension,
          [measureColumn!]: avg
        };
      });
    }
    
    // Sort the data for better visualization
    processedData.sort((a, b) => b[measureColumn!] - a[measureColumn!]);
    
    // Limit data points for better visualization
    if (processedData.length > 15) {
      processedData = processedData.slice(0, 15);
    }
  }
  
  // Generate explanation based on the data
  let explanation = '';
  if (chartType === 'pie') {
    explanation = `Here's a pie chart showing the distribution of ${measureColumn} by ${dimensionColumn}.`;
  } else if (chartType === 'line') {
    explanation = `This line chart shows the trend of ${measureColumn} over ${dimensionColumn}.`;
  } else if (chartType === 'scatter') {
    explanation = `This scatter plot shows the relationship between ${dimensionColumn} and ${measureColumn}.`;
  } else {
    explanation = `Here's a bar chart comparing ${measureColumn} across different ${dimensionColumn} values.`;
  }
  
  // Add information about data filtering if applicable
  if (processedData.length === 15 && data.length > 15) {
    explanation += ` Showing only the top 15 results out of ${data.length} total records for better visualization.`;
  }
  
  // Choose appropriate color scheme based on the chart type
  let colorScheme;
  if (chartType === 'pie') {
    colorScheme = COLOR_SCHEMES.vibrant;
  } else if (chartType === 'line') {
    colorScheme = COLOR_SCHEMES.gradient;
  } else if (chartType === 'scatter') {
    colorScheme = COLOR_SCHEMES.purple;
  } else {
    colorScheme = COLOR_SCHEMES.gradient;
  }
  
  // Generate title
  const title = generateTitle(query, measure, dimension);
  
  return {
    data: processedData,
    chartType,
    explanation,
    chartConfig: {
      title,
      xAxisTitle: dimensionColumn as string,
      yAxisTitle: measureColumn as string,
      colorScheme
    }
  };
}

// Generate a descriptive title for the chart
function generateTitle(query: string, measure: string | null, dimension: string | null): string {
  const queryLower = query.toLowerCase();
  
  if (!measure || !dimension) return 'Data Visualization';
  
  if (queryLower.includes('how many') || queryLower.includes('count')) {
    return `Count of ${dimension}`;
  } else if (queryLower.includes('average') || queryLower.includes('avg') || queryLower.includes('mean')) {
    return `Average ${measure} by ${dimension}`;
  } else if (queryLower.includes('total') || queryLower.includes('sum')) {
    return `Total ${measure} by ${dimension}`;
  } else if (queryLower.includes('distribution') || queryLower.includes('breakdown')) {
    return `Distribution of ${measure} across ${dimension}`;
  } else if (queryLower.includes('compare') || queryLower.includes('comparison')) {
    return `Comparison of ${measure} by ${dimension}`;
  } else if (queryLower.includes('trend') || queryLower.includes('over time')) {
    return `${measure} Trend Over ${dimension}`;
  } else {
    return `${measure} by ${dimension}`;
  }
}
