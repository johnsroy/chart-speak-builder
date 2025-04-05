
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
    
    if (!openaiApiKey || !anthropicApiKey) {
      throw new Error("Missing required API keys");
    }
    
    // Create Supabase client with the service role key for admin access
    const supabase = createClient(supabaseUrl, supabaseServiceRole);
    
    const { dataset_id, query_text, model_type } = await req.json();
    
    if (!dataset_id || !query_text) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
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
    
    // Download the dataset file
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
    
    // Parse the CSV data (first 100 rows for analysis)
    const text = await fileData.text();
    const data = await parseCSV(text, 100);
    
    // Generate schema for the AI to understand
    const schema = dataset.column_schema;
    const schemaString = Object.entries(schema)
      .map(([col, type]) => `${col} (${type})`)
      .join(", ");
    
    // Sample data for AI to understand the dataset
    const sampleDataString = JSON.stringify(data.slice(0, 5), null, 2);
    
    // Determine which AI model to use
    const aiResponse = model_type === 'anthropic' 
      ? await queryAnthropicAI(query_text, schemaString, sampleDataString, dataset.name, anthropicApiKey)
      : await queryOpenAI(query_text, schemaString, sampleDataString, dataset.name, openaiApiKey);
    
    // Process the full dataset based on AI response
    const processedResult = await processDataWithAIResponse(data, aiResponse, schema);
    
    return new Response(
      JSON.stringify(processedResult),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error processing AI query:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

// Helper function to parse CSV
async function parseCSV(text, limitRows = null) {
  const lines = text.split('\n');
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  
  const data = [];
  const rowLimit = limitRows ? Math.min(limitRows, lines.length) : lines.length;
  
  for (let i = 1; i < rowLimit; i++) {
    if (!lines[i].trim()) continue;
    
    // Handle quoted values that may contain commas
    const row = {};
    let j = 0;
    let field = '';
    let inQuotes = false;
    
    for (let char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        // End of field
        row[headers[j]] = field.trim();
        field = '';
        j++;
      } else {
        field += char;
      }
    }
    // Add the last field
    if (j < headers.length) {
      row[headers[j]] = field.trim();
    }
    
    // Convert numeric values
    for (const key in row) {
      const value = row[key];
      if (!isNaN(value) && value.trim() !== '') {
        row[key] = Number(value);
      }
    }
    
    data.push(row);
  }
  
  return data;
}

// Query OpenAI for natural language interpretation
async function queryOpenAI(query, schema, sampleData, datasetName, apiKey) {
  const prompt = `
You are an AI data analyst assistant. You'll help analyze a dataset named "${datasetName}".

Dataset schema: ${schema}

Sample data:
${sampleData}

User query: "${query}"

Please provide a detailed analysis plan in JSON format:
1. Interpret what visualization would best answer this query (bar, line, pie, scatter, or table)
2. Select the appropriate columns for the visualization
3. Apply any necessary filters, grouping, aggregations, or calculations
4. Suggest chart configuration (title, axes labels, etc.)

Return ONLY valid JSON in this exact structure:
{
  "chartType": "bar|line|pie|scatter|table",
  "dimensions": [{"field": "column_name"}],
  "measures": [{"field": "column_name", "aggregation": "sum|avg|min|max|count"}],
  "filters": [{"field": "column_name", "operator": "eq|neq|gt|lt|gte|lte|contains", "value": "value"}],
  "sort": [{"field": "column_name", "direction": "asc|desc"}],
  "limit": 20,
  "chartConfig": {
    "title": "Chart Title",
    "xAxisTitle": "X Axis Title",
    "yAxisTitle": "Y Axis Title"
  },
  "explanation": "Brief explanation of why this visualization answers the query"
}
`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a data analysis assistant that outputs valid JSON.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
    }),
  });

  const result = await response.json();
  if (result.error) {
    throw new Error(`OpenAI API Error: ${result.error.message}`);
  }

  try {
    // Parse the content to ensure it's valid JSON
    const content = result.choices[0].message.content;
    // Extract JSON if it's surrounded by markdown code blocks
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/);
    const jsonString = jsonMatch ? jsonMatch[1] : content;
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Failed to parse OpenAI response:", e);
    throw new Error("Failed to parse AI response into valid JSON");
  }
}

// Query Anthropic Claude for natural language interpretation
async function queryAnthropicAI(query, schema, sampleData, datasetName, apiKey) {
  const prompt = `
You are an AI data analyst assistant. You'll help analyze a dataset named "${datasetName}".

Dataset schema: ${schema}

Sample data:
${sampleData}

User query: "${query}"

Please provide a detailed analysis plan in JSON format:
1. Interpret what visualization would best answer this query (bar, line, pie, scatter, or table)
2. Select the appropriate columns for the visualization
3. Apply any necessary filters, grouping, aggregations, or calculations
4. Suggest chart configuration (title, axes labels, etc.)

Return ONLY valid JSON in this exact structure:
{
  "chartType": "bar|line|pie|scatter|table",
  "dimensions": [{"field": "column_name"}],
  "measures": [{"field": "column_name", "aggregation": "sum|avg|min|max|count"}],
  "filters": [{"field": "column_name", "operator": "eq|neq|gt|lt|gte|lte|contains", "value": "value"}],
  "sort": [{"field": "column_name", "direction": "asc|desc"}],
  "limit": 20,
  "chartConfig": {
    "title": "Chart Title",
    "xAxisTitle": "X Axis Title",
    "yAxisTitle": "Y Axis Title"
  },
  "explanation": "Brief explanation of why this visualization answers the query"
}
`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 4000,
      temperature: 0.2,
      system: "You are a data analysis assistant that outputs valid JSON.",
      messages: [
        { role: 'user', content: prompt }
      ]
    }),
  });

  const result = await response.json();
  if (result.error) {
    throw new Error(`Anthropic API Error: ${result.error.message}`);
  }

  try {
    // Parse the content to ensure it's valid JSON
    const content = result.content[0].text;
    // Extract JSON if it's surrounded by markdown code blocks
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```([\s\S]*?)```/);
    const jsonString = jsonMatch ? jsonMatch[1] : content;
    return JSON.parse(jsonString);
  } catch (e) {
    console.error("Failed to parse Anthropic response:", e);
    throw new Error("Failed to parse AI response into valid JSON");
  }
}

// Process the data using the AI response
async function processDataWithAIResponse(data, aiResponse, schema) {
  try {
    let processedData = [...data];
    
    // Apply filters
    if (aiResponse.filters && aiResponse.filters.length > 0) {
      processedData = processedData.filter(row => {
        return aiResponse.filters.every(filter => {
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
    if (aiResponse.dimensions && aiResponse.dimensions.length > 0) {
      const groupedData = new Map();
      
      processedData.forEach(row => {
        // Create a key based on the dimension values
        const dimensionKey = aiResponse.dimensions.map(dim => row[dim.field]).join('|');
        
        if (!groupedData.has(dimensionKey)) {
          const newGroup = {
            // Add dimension fields
            ...aiResponse.dimensions.reduce((obj, dim) => ({
              ...obj,
              [dim.field]: row[dim.field]
            }), {}),
            // Initialize measure fields
            ...aiResponse.measures.reduce((obj, measure) => ({
              ...obj,
              [`${measure.aggregation}_${measure.field}`]: measure.aggregation === 'count' ? 1 : Number(row[measure.field]) || 0,
              [`${measure.field}_values`]: measure.aggregation === 'count' ? [1] : [Number(row[measure.field]) || 0]
            }), {})
          };
          groupedData.set(dimensionKey, newGroup);
        } else {
          const group = groupedData.get(dimensionKey);
          
          // Update measures
          aiResponse.measures.forEach(measure => {
            const value = measure.aggregation === 'count' ? 1 : Number(row[measure.field]) || 0;
            group[`${measure.field}_values`].push(value);
            
            if (measure.aggregation === 'count') {
              group[`${measure.aggregation}_${measure.field}`] += 1;
            } else if (measure.aggregation === 'sum') {
              group[`${measure.aggregation}_${measure.field}`] += value;
            }
            // Calculate avg, min, max after all data is processed
          });
        }
      });
      
      // Calculate final aggregations
      for (const group of groupedData.values()) {
        aiResponse.measures.forEach(measure => {
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
    if (aiResponse.sort && aiResponse.sort.length > 0) {
      processedData.sort((a, b) => {
        for (const sort of aiResponse.sort) {
          const fieldA = a[sort.field];
          const fieldB = b[sort.field];
          
          if (fieldA < fieldB) return sort.direction === 'asc' ? -1 : 1;
          if (fieldA > fieldB) return sort.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    // Apply limit
    if (aiResponse.limit) {
      processedData = processedData.slice(0, aiResponse.limit);
    }
    
    return {
      data: processedData,
      chartType: aiResponse.chartType,
      chartConfig: aiResponse.chartConfig,
      explanation: aiResponse.explanation
    };
  } catch (error) {
    console.error('Error processing data with AI response:', error);
    throw new Error(`Failed to process data: ${error.message}`);
  }
}
