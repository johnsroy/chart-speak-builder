
// Import necessary modules
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
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    // Create Supabase client with the service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceRole);
    
    // Get request body
    const { datasetId, query, modelType } = await req.json();
    
    console.log(`Processing query: "${query}" for dataset ${datasetId} using ${modelType}`);
    
    if (!datasetId || !query) {
      return new Response(
        JSON.stringify({ error: "Missing datasetId or query" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Get the dataset
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', datasetId)
      .single();
      
    if (datasetError) {
      console.error('Dataset fetch error:', datasetError);
      return new Response(
        JSON.stringify({ error: `Failed to get dataset: ${datasetError.message}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("Dataset found:", dataset.name);
    
    // Download the dataset file
    const { data: fileData, error: fileError } = await supabase
      .storage
      .from(dataset.storage_type === 'local' ? 'datasets' : dataset.storage_type)
      .download(dataset.storage_path);
      
    if (fileError) {
      console.error('File download error:', fileError);
      return new Response(
        JSON.stringify({ error: `Failed to download dataset file: ${fileError.message}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Parse data based on file type
    const parsedData = await parseFileData(fileData, dataset.file_name);
    if (!parsedData || parsedData.length === 0) {
      console.error('Failed to parse file or file is empty');
      return new Response(
        JSON.stringify({ error: "Failed to process dataset. File may be empty or in an unsupported format." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // Log sample of the data for debugging
    console.log(`Parsed ${parsedData.length} rows. Sample:`, parsedData.slice(0, 2));
    
    // Process query with AI based on the dataset
    let apiKey;
    let result;
    
    // Auto-detect schema if not present
    const schema = dataset.column_schema || inferSchemaFromData(parsedData[0]);
    
    if (modelType === 'anthropic') {
      apiKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "Anthropic API key not configured" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      result = await processWithAnthropic(query, parsedData, schema);
    } else {
      // Default to OpenAI
      apiKey = Deno.env.get("OPENAI_API_KEY");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "OpenAI API key not configured" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
      result = await processWithOpenAI(query, parsedData, schema);
    }
    
    // Return the result
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in AI query:", error);
    return new Response(
      JSON.stringify({ error: `Error processing AI query: ${error.message || "Unknown error"}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Parse the file data based on file extension
async function parseFileData(fileData: Blob, fileName: string): Promise<any[]> {
  try {
    const text = await fileData.text();
    
    if (fileName.endsWith('.csv')) {
      return parseCSV(text);
    } else if (fileName.endsWith('.json')) {
      return JSON.parse(text);
    } else {
      throw new Error(`Unsupported file type: ${fileName}`);
    }
  } catch (error) {
    console.error('Error parsing file data:', error);
    throw error;
  }
}

// Parse CSV data
function parseCSV(text: string): any[] {
  const lines = text.split('\n');
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(header => header.trim());
  const results = [];
  
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    // Handle values with commas within quotes properly
    let row: string[] = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(currentField);
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    // Add the last field
    row.push(currentField);
    
    // If row doesn't have enough values, fill with empty strings
    while (row.length < headers.length) {
      row.push('');
    }
    
    // Create object from headers and values
    const obj: Record<string, any> = {};
    
    for (let j = 0; j < headers.length; j++) {
      // Try to convert to number if possible
      const value = row[j].trim();
      
      // Handle empty values
      if (!value) {
        obj[headers[j]] = null;
        continue;
      }
      
      // Convert to number if possible
      const numValue = Number(value);
      obj[headers[j]] = !isNaN(numValue) ? numValue : value;
    }
    
    results.push(obj);
  }
  
  return results;
}

// Infer schema from data
function inferSchemaFromData(sample: Record<string, any>): Record<string, string> {
  if (!sample) return {};
  
  const schema: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(sample)) {
    if (typeof value === 'number') {
      schema[key] = 'number';
    } else if (typeof value === 'string') {
      // Check if it's a date
      if (!isNaN(Date.parse(value)) && String(value).match(/^\d{4}-\d{2}-\d{2}/)) {
        schema[key] = 'date';
      } else {
        schema[key] = 'string';
      }
    } else if (value === null || value === undefined) {
      schema[key] = 'unknown';
    } else {
      schema[key] = 'object';
    }
  }
  
  return schema;
}

// Process query with OpenAI
async function processWithOpenAI(query: string, data: any[], schema: Record<string, string>): Promise<any> {
  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    const numericColumns = Object.entries(schema)
      .filter(([_, type]) => type === 'number')
      .map(([col, _]) => col);
      
    const categoricalColumns = Object.entries(schema)
      .filter(([_, type]) => type === 'string')
      .map(([col, _]) => col);
      
    const dateColumns = Object.entries(schema)
      .filter(([_, type]) => type === 'date')
      .map(([col, _]) => col);
    
    // Sample the data to avoid sending too much data to OpenAI
    const sampleSize = Math.min(10, data.length);
    const dataSample = data.slice(0, sampleSize);
    
    // Prepare the columns info
    const columnsInfo = Object.entries(schema).map(([name, type]) => `${name} (${type})`).join('\n');
    
    const messages = [
      {
        "role": "system",
        "content": `You are a data visualization assistant. Analyze the data and create appropriate visualizations based on user queries.
          Create JSON with these keys:
          - data: transformed dataset for visualization (array of objects with necessary fields only)
          - chartType: one of 'bar', 'line', 'pie', 'scatter', or any other appropriate chart
          - explanation: brief explanation of the visualization
          - chartConfig: object with title, subtitle, xAxis, yAxis, and other config options
          
          DO NOT include explanations in your response, just return the JSON. Make sure the JSON is valid and doesn't contain any wrapped lines.`
      },
      {
        "role": "user", 
        "content": `I have a dataset with ${data.length} rows. Here are the columns and their types:
          ${columnsInfo}
          
          Here's a sample of the data:
          ${JSON.stringify(dataSample, null, 2)}
          
          User query: "${query}"
          
          Return a JSON object with the visualization data, chart type, and configuration.`
      }
    ];
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }
    
    const responseData = await response.json();
    const aiResponse = responseData.choices[0].message.content;
    
    try {
      // Extract JSON from response (in case there's text around it)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;
      const parsedResponse = JSON.parse(jsonString);
      
      // Ensure all required properties exist
      if (!parsedResponse.data || !Array.isArray(parsedResponse.data)) {
        parsedResponse.data = selectRelevantData(data, query, schema);
      }
      
      if (!parsedResponse.chartType) {
        parsedResponse.chartType = guessChartType(query, schema);
      }
      
      if (!parsedResponse.explanation) {
        parsedResponse.explanation = `Chart based on "${query}"`;
      }
      
      if (!parsedResponse.chartConfig) {
        parsedResponse.chartConfig = {
          title: query,
          xAxis: categoricalColumns[0] || dateColumns[0] || Object.keys(schema)[0] || '',
          yAxis: numericColumns[0] || Object.keys(schema)[1] || '',
        };
      }
      
      return parsedResponse;
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      console.log("Raw AI response:", aiResponse);
      
      // Fallback with default visualization
      return generateFallbackVisualization(data, query, schema);
    }
  } catch (error) {
    console.error("Error with OpenAI API:", error);
    throw error;
  }
}

// Process query with Anthropic
async function processWithAnthropic(query: string, data: any[], schema: Record<string, string>): Promise<any> {
  try {
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    const numericColumns = Object.entries(schema)
      .filter(([_, type]) => type === 'number')
      .map(([col, _]) => col);
      
    const categoricalColumns = Object.entries(schema)
      .filter(([_, type]) => type === 'string')
      .map(([col, _]) => col);
      
    const dateColumns = Object.entries(schema)
      .filter(([_, type]) => type === 'date')
      .map(([col, _]) => col);
    
    // Sample the data to avoid sending too much data to Anthropic
    const sampleSize = Math.min(10, data.length);
    const dataSample = data.slice(0, sampleSize);
    
    // Prepare the columns info
    const columnsInfo = Object.entries(schema).map(([name, type]) => `${name} (${type})`).join('\n');
    
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 2048,
        system: `You are a data visualization assistant. Analyze the data and create appropriate visualizations based on user queries.
          Create JSON with these keys:
          - data: transformed dataset for visualization (array of objects with necessary fields only)
          - chartType: one of 'bar', 'line', 'pie', 'scatter', or any other appropriate chart
          - explanation: brief explanation of the visualization
          - chartConfig: object with title, subtitle, xAxis, yAxis, and other config options
          
          DO NOT include explanations in your response, just return the JSON. Make sure the JSON is valid and doesn't contain any wrapped lines.`,
        messages: [
          {
            "role": "user", 
            "content": `I have a dataset with ${data.length} rows. Here are the columns and their types:
              ${columnsInfo}
              
              Here's a sample of the data:
              ${JSON.stringify(dataSample, null, 2)}
              
              User query: "${query}"
              
              Return a JSON object with the visualization data, chart type, and configuration.`
          }
        ],
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", errorText);
      throw new Error(`Anthropic API error: ${response.status} ${errorText}`);
    }
    
    const responseData = await response.json();
    const aiResponse = responseData.content[0].text;
    
    try {
      // Extract JSON from response (in case there's text around it)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[0] : aiResponse;
      const parsedResponse = JSON.parse(jsonString);
      
      // Ensure all required properties exist
      if (!parsedResponse.data || !Array.isArray(parsedResponse.data)) {
        parsedResponse.data = selectRelevantData(data, query, schema);
      }
      
      if (!parsedResponse.chartType) {
        parsedResponse.chartType = guessChartType(query, schema);
      }
      
      if (!parsedResponse.explanation) {
        parsedResponse.explanation = `Chart based on "${query}"`;
      }
      
      if (!parsedResponse.chartConfig) {
        parsedResponse.chartConfig = {
          title: query,
          xAxis: categoricalColumns[0] || dateColumns[0] || Object.keys(schema)[0] || '',
          yAxis: numericColumns[0] || Object.keys(schema)[1] || '',
        };
      }
      
      return parsedResponse;
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      console.log("Raw AI response:", aiResponse);
      
      // Fallback with default visualization
      return generateFallbackVisualization(data, query, schema);
    }
  } catch (error) {
    console.error("Error with Anthropic API:", error);
    throw error;
  }
}

// Helper function to guess chart type from query and schema
function guessChartType(query: string, schema: Record<string, string>): string {
  const queryLower = query.toLowerCase();
  
  const hasTimeOrDate = Object.entries(schema).some(([key, type]) => 
    type === 'date' || key.toLowerCase().includes('date') || 
    key.toLowerCase().includes('time') || key.toLowerCase().includes('year')
  );
  
  // Check for explicit chart type mentions
  if (queryLower.includes('bar chart') || queryLower.includes('bar graph') || 
      queryLower.includes('histogram') || queryLower.includes('compare')) {
    return 'bar';
  } else if (queryLower.includes('line chart') || queryLower.includes('trend') || 
             queryLower.includes('over time') || hasTimeOrDate) {
    return 'line';
  } else if (queryLower.includes('pie chart') || queryLower.includes('percentage') || 
             queryLower.includes('proportion') || queryLower.includes('distribution')) {
    return 'pie';
  } else if (queryLower.includes('scatter') || queryLower.includes('correlation')) {
    return 'scatter';
  } else if (queryLower.includes('map') || queryLower.includes('geographic')) {
    return 'map';
  }
  
  // Default based on schema
  if (hasTimeOrDate) {
    return 'line';
  }
  
  // Count numeric and categorical columns
  const numericCount = Object.values(schema).filter(type => type === 'number').length;
  const categoricalCount = Object.values(schema).filter(type => type === 'string').length;
  
  // If we have more categorical than numeric, probably want a bar chart
  if (categoricalCount >= numericCount) {
    return 'bar';
  }
  
  // Default to bar chart
  return 'bar';
}

// Helper function to select relevant data for visualization
function selectRelevantData(data: any[], query: string, schema: Record<string, string>): any[] {
  const queryLower = query.toLowerCase();
  const numericColumns = Object.entries(schema)
    .filter(([_, type]) => type === 'number')
    .map(([col, _]) => col);
    
  const categoricalColumns = Object.entries(schema)
    .filter(([_, type]) => type === 'string')
    .map(([col, _]) => col);
    
  const dateColumns = Object.entries(schema)
    .filter(([_, type]) => type === 'date')
    .map(([col, _]) => col);
  
  // Limit data size for visualization
  const maxDataPoints = 50;
  let limitedData = data.slice(0, maxDataPoints);
  
  return limitedData;
}

// Function to generate fallback visualization when AI fails
function generateFallbackVisualization(data: any[], query: string, schema: Record<string, string>): any {
  const numericColumns = Object.entries(schema)
    .filter(([_, type]) => type === 'number')
    .map(([col, _]) => col);
    
  const categoricalColumns = Object.entries(schema)
    .filter(([_, type]) => type === 'string')
    .map(([col, _]) => col);
    
  const dateColumns = Object.entries(schema)
    .filter(([_, type]) => type === 'date')
    .map(([col, _]) => col);
  
  // Choose reasonable x and y axes
  const xAxis = categoricalColumns[0] || dateColumns[0] || Object.keys(schema)[0];
  const yAxis = numericColumns[0] || Object.keys(schema)[1];
  
  // Choose chart type based on the data
  let chartType = 'bar';
  if (dateColumns.length > 0 && numericColumns.length > 0) {
    chartType = 'line';
  } else if (numericColumns.length > 1 && !categoricalColumns.length) {
    chartType = 'scatter';
  } else if (categoricalColumns.length === 1 && numericColumns.length === 1) {
    chartType = 'bar';
  }
  
  // Sample data for visualization
  const limitedData = data.slice(0, 50);
  
  return {
    data: limitedData,
    chartType: chartType,
    explanation: `Chart showing ${yAxis || 'values'} by ${xAxis || 'category'}`,
    chartConfig: {
      title: query || 'Data Visualization',
      xAxis: xAxis,
      yAxis: yAxis,
      xAxisTitle: xAxis,
      yAxisTitle: yAxis
    }
  };
}
