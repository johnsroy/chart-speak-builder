
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Define interface for query result
interface QueryResult {
  data: any[];
  chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'table';
  chartConfig: any;
  sql?: string;
  explanation?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    const { dataset_id, query_text, model_type = 'openai' } = await req.json();
    
    if (!dataset_id) {
      throw new Error('Missing dataset_id parameter');
    }
    
    if (!query_text) {
      throw new Error('Missing query_text parameter');
    }
    
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    // Get API keys for AI models
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
    
    // Check if we have the necessary API key
    if ((model_type === "openai" && !openaiApiKey) || (model_type === "anthropic" && !anthropicApiKey)) {
      throw new Error(`${model_type} API key is not configured`);
    }
    
    // Create Supabase client with service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceRole);
    
    // Get dataset metadata
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', dataset_id)
      .single();
    
    if (datasetError) {
      throw new Error(`Failed to get dataset: ${datasetError.message}`);
    }
    
    // Get dataset sample for AI processing
    let datasetSample;
    let sampleError = null;
    
    try {
      // Get a preview of the dataset
      const { data: previewData, error: previewError } = await supabase
        .from('datasets')
        .select('file_name, storage_path, storage_type, column_schema')
        .eq('id', dataset_id)
        .single();
        
      if (previewError) throw previewError;
      
      // If the dataset is stored in Supabase storage
      if (previewData.storage_type === 'supabase') {
        const { data, error: storageError } = await supabase
          .storage
          .from('datasets')
          .download(previewData.storage_path);
          
        if (storageError) throw storageError;
        
        // Parse the CSV data (first 100 rows for sample)
        const text = await data.text();
        datasetSample = await parseCSV(text, 100, previewData.column_schema);
      } else {
        datasetSample = generateSampleData(dataset.column_schema || {});
      }
    } catch (error) {
      console.error("Error getting dataset sample:", error);
      sampleError = error;
      // Generate sample data as fallback
      datasetSample = generateSampleData(dataset.column_schema || {});
    }
    
    // Process using AI depending on the requested model
    let result: QueryResult;
    
    if (model_type === 'openai') {
      result = await processWithOpenAI(query_text, dataset, datasetSample, openaiApiKey, sampleError);
    } else {
      result = await processWithAnthropic(query_text, dataset, datasetSample, anthropicApiKey, sampleError);
    }
    
    // Log the query for future improvements
    try {
      await supabase.from('queries').insert({
        user_id: dataset.user_id,
        dataset_id: dataset_id,
        query_type: 'natural_language',
        query_text: query_text,
        name: query_text.slice(0, 50) + (query_text.length > 50 ? '...' : ''),
        query_config: {
          model: model_type,
          chart_type: result.chartType,
        }
      });
    } catch (logError) {
      // Non-critical error, just log and continue
      console.error("Error logging query:", logError);
    }
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (error) {
    console.error("Error processing AI query:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        chartType: 'table',
        data: [],
        chartConfig: {
          title: "Error Processing Query"
        },
        explanation: `Error: ${error.message}. Please try again with a different query.`
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500
      }
    );
  }
});

// Helper function to parse CSV data with schema-aware type conversion
async function parseCSV(text: string, limit = 100, schema: Record<string, string> = {}) {
  const lines = text.split('\n');
  if (lines.length < 2) return [];
  
  // Handle quotes in CSV
  const parseCSVLine = (line: string) => {
    const values = [];
    let currentValue = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        // Toggle quote state
        inQuotes = !inQuotes;
        // Add the quote if we're inside quotes (preserve actual quotes in values)
        if (inQuotes || (i > 0 && line[i-1] === '"')) {
          currentValue += char;
        }
      }
      else if (char === ',' && !inQuotes) {
        // End of value
        values.push(currentValue.trim());
        currentValue = "";
      }
      else {
        // Add character to current value
        currentValue += char;
      }
    }
    
    // Add the last value
    values.push(currentValue.trim());
    
    return values;
  };
  
  const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"(.+)"$/, '$1').trim());
  
  const data = [];
  for (let i = 1; i < Math.min(lines.length, limit + 1); i++) {
    if (!lines[i].trim()) continue;
    
    const values = parseCSVLine(lines[i]);
    const row: Record<string, any> = {};
    
    headers.forEach((header, index) => {
      // Remove quotes if present
      let value = values[index] || '';
      value = value.replace(/^"(.+)"$/, '$1');
      
      // Convert value based on schema if available
      if (schema && schema[header]) {
        const colType = schema[header];
        
        if (colType === 'number' || colType === 'integer') {
          const numValue = Number(value);
          row[header] = isNaN(numValue) ? value : numValue;
        } 
        else if (colType === 'date') {
          const dateValue = new Date(value);
          row[header] = isNaN(dateValue.getTime()) ? value : dateValue.toISOString().split('T')[0];
        }
        else {
          row[header] = value;
        }
      }
      else {
        // Auto-detect number
        const numValue = Number(value);
        row[header] = isNaN(numValue) ? value : numValue;
      }
    });
    
    data.push(row);
  }
  
  return data;
}

// Generate sample data for testing
function generateSampleData(schema: Record<string, string> = {}) {
  const columns = Object.keys(schema).length > 0 ? Object.keys(schema) : ["category", "value"];
  const data = [];
  
  for (let i = 0; i < 5; i++) {
    const row: Record<string, any> = {};
    columns.forEach(col => {
      const colType = schema[col] || "string";
      
      if (colType === "number" || colType === "integer") {
        row[col] = Math.round(Math.random() * 100);
      } else if (colType === "date") {
        const date = new Date();
        date.setDate(date.getDate() - i * 30);
        row[col] = date.toISOString().split('T')[0];
      } else {
        row[col] = `Sample ${col} ${i + 1}`;
      }
    });
    data.push(row);
  }
  
  return data;
}

// Process query with OpenAI
async function processWithOpenAI(query: string, dataset: any, datasetSample: any[], apiKey: string, sampleError: Error | null): Promise<QueryResult> {
  try {
    const prompt = `
      You are DataViz AI, a data analyst assistant helping to analyze a dataset.
      
      Dataset name: ${dataset.name}
      Dataset file: ${dataset.file_name}
      Dataset schema: ${JSON.stringify(dataset.column_schema || {})}
      ${sampleError ? `Note: There was an error loading the full dataset: ${sampleError.message}` : ''}
      
      Here is a sample of the data (first ${datasetSample.length} rows):
      ${JSON.stringify(datasetSample.slice(0, 5))}
      
      User query: "${query}"
      
      Analyze this dataset based on the user's query. Return a JSON with:
      1. The most appropriate chart type ('bar', 'line', 'pie', 'scatter', or 'table')
      2. A processed subset of data optimized for visualization
      3. Chart configuration (title, axis labels, etc.)
      4. A brief explanation of insights found

      Guidelines:
      - Use bar charts for comparing values across categories
      - Use line charts for trends over time or sequences
      - Use pie charts for proportions or distributions (limit to 8 categories)
      - Use scatter plots for relationships between two variables
      - Use tables for detailed data or when no clear visualization applies
      - Limit to 15 data points for readability
      - Provide insightful explanations about patterns in the data
      
      Return ONLY a valid JSON object with this structure:
      {
        "chartType": string,
        "data": array,
        "chartConfig": {
          "title": string,
          "xAxisTitle": string,
          "yAxisTitle": string
        },
        "explanation": string
      }
    `;
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system", 
            content: "You are a data analyst AI that analyzes datasets and only replies with valid JSON."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    if (!responseData.choices || !responseData.choices[0]) {
      throw new Error("Invalid response from OpenAI");
    }
    
    const aiResponse = JSON.parse(responseData.choices[0].message.content);
    
    // Validate and parse the response
    return {
      chartType: aiResponse.chartType || 'bar',
      data: aiResponse.data || [],
      chartConfig: aiResponse.chartConfig || { title: query },
      explanation: aiResponse.explanation || "Analysis generated with OpenAI"
    };
  } catch (error) {
    console.error("OpenAI processing error:", error);
    throw new Error(`Failed to process with OpenAI: ${error.message}`);
  }
}

// Process query with Anthropic
async function processWithAnthropic(query: string, dataset: any, datasetSample: any[], apiKey: string, sampleError: Error | null): Promise<QueryResult> {
  try {
    const prompt = `
      You are DataViz AI, a data analyst assistant helping to analyze a dataset.
      
      Dataset name: ${dataset.name}
      Dataset file: ${dataset.file_name}
      Dataset schema: ${JSON.stringify(dataset.column_schema || {})}
      ${sampleError ? `Note: There was an error loading the full dataset: ${sampleError.message}` : ''}
      
      Here is a sample of the data (first ${datasetSample.length} rows):
      ${JSON.stringify(datasetSample.slice(0, 5))}
      
      User query: "${query}"
      
      Analyze this dataset based on the user's query. Return a JSON with:
      1. The most appropriate chart type ('bar', 'line', 'pie', 'scatter', or 'table')
      2. A processed subset of data optimized for visualization
      3. Chart configuration (title, axis labels, etc.)
      4. A brief explanation of insights found

      Guidelines:
      - Use bar charts for comparing values across categories
      - Use line charts for trends over time or sequences
      - Use pie charts for proportions or distributions (limit to 8 categories)
      - Use scatter plots for relationships between two variables
      - Use tables for detailed data or when no clear visualization applies
      - Limit to 15 data points for readability
      - Provide insightful explanations about patterns in the data
      
      Return ONLY a valid JSON object with this structure:
      {
        "chartType": string,
        "data": array,
        "chartConfig": {
          "title": string,
          "xAxisTitle": string,
          "yAxisTitle": string
        },
        "explanation": string
      }
    `;
    
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-sonnet-20240229",
        max_tokens: 2000,
        system: "You are a data analyst AI that analyzes datasets and only replies with valid JSON.",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    
    if (!responseData.content || !responseData.content[0] || !responseData.content[0].text) {
      throw new Error("Invalid response from Anthropic");
    }
    
    const contentText = responseData.content[0].text;
    // Extract JSON from the response (Claude might include markdown code fences)
    const jsonMatch = contentText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, contentText];
    const jsonString = jsonMatch[1].trim();
    
    const aiResponse = JSON.parse(jsonString);
    
    // Validate and parse the response
    return {
      chartType: aiResponse.chartType || 'bar',
      data: aiResponse.data || [],
      chartConfig: aiResponse.chartConfig || { title: query },
      explanation: aiResponse.explanation || "Analysis generated with Claude AI"
    };
  } catch (error) {
    console.error("Anthropic processing error:", error);
    throw new Error(`Failed to process with Anthropic: ${error.message}`);
  }
}
