
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
    try {
      // If the dataset is stored in Supabase storage
      if (dataset.storage_type === 'supabase') {
        const { data, error: storageError } = await supabase
          .storage
          .from('datasets')
          .download(dataset.storage_path);
          
        if (storageError) {
          throw storageError;
        }
        
        // Parse the CSV data (first 100 rows for sample)
        const text = await data.text();
        datasetSample = await parseCSV(text, 100);
      } 
      // For local/fallback storage, generate sample data
      else {
        datasetSample = generateSampleData(dataset.column_schema || {});
      }
    } catch (error) {
      console.error("Error getting dataset sample:", error);
      // Generate sample data as fallback
      datasetSample = generateSampleData(dataset.column_schema || {});
    }
    
    // Process using AI depending on the requested model
    let result: QueryResult;
    
    if (model_type === 'openai') {
      result = await processWithOpenAI(query_text, dataset, datasetSample, openaiApiKey);
    } else {
      result = await processWithAnthropic(query_text, dataset, datasetSample, anthropicApiKey);
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

// Helper function to parse CSV data
async function parseCSV(text: string, limit = 100) {
  const lines = text.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  const data = [];
  for (let i = 1; i < Math.min(lines.length, limit + 1); i++) {
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
async function processWithOpenAI(query: string, dataset: any, datasetSample: any[], apiKey: string): Promise<QueryResult> {
  try {
    const prompt = `
      You are a data analyst assistant helping to analyze a dataset.
      
      Dataset name: ${dataset.name}
      Dataset schema: ${JSON.stringify(dataset.column_schema || {})}
      Dataset sample: ${JSON.stringify(datasetSample.slice(0, 5))}
      
      User query: "${query}"
      
      Based on the user query, analyze the dataset and return a JSON with:
      1. The most appropriate chart type ('bar', 'line', 'pie', 'scatter', or 'table')
      2. A processed subset of data optimized for visualization
      3. Chart configuration (title, axis labels, etc.)
      4. A brief explanation of the insights
      
      When selecting a chart type:
      - Use bar charts for comparisons across categories
      - Use line charts for trends over time
      - Use pie charts for proportions of a whole
      - Use scatter plots for relationships between variables
      - Use tables for detailed data views or when no clear visualization applies
      
      Return ONLY a valid JSON object with the following structure:
      {
        "chartType": string,
        "data": array,
        "chartConfig": object,
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
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system", 
            content: "You are a data analyst that only replies with valid JSON."
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
      explanation: aiResponse.explanation || "Analysis generated with AI"
    };
  } catch (error) {
    console.error("OpenAI processing error:", error);
    throw new Error(`Failed to process with OpenAI: ${error.message}`);
  }
}

// Process query with Anthropic
async function processWithAnthropic(query: string, dataset: any, datasetSample: any[], apiKey: string): Promise<QueryResult> {
  try {
    const prompt = `
      You are a data analyst assistant helping to analyze a dataset.
      
      Dataset name: ${dataset.name}
      Dataset schema: ${JSON.stringify(dataset.column_schema || {})}
      Dataset sample: ${JSON.stringify(datasetSample.slice(0, 5))}
      
      User query: "${query}"
      
      Based on the user query, analyze the dataset and return a JSON with:
      1. The most appropriate chart type ('bar', 'line', 'pie', 'scatter', or 'table')
      2. A processed subset of data optimized for visualization
      3. Chart configuration (title, axis labels, etc.)
      4. A brief explanation of the insights
      
      When selecting a chart type:
      - Use bar charts for comparisons across categories
      - Use line charts for trends over time
      - Use pie charts for proportions of a whole
      - Use scatter plots for relationships between variables
      - Use tables for detailed data views or when no clear visualization applies
      
      Return ONLY a valid JSON object with the following structure:
      {
        "chartType": string,
        "data": array,
        "chartConfig": object,
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
        system: "You are a data analyst that only replies with valid JSON.",
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
