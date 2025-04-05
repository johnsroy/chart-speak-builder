
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    
    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceRole);
    
    // Parse request body
    const { datasetId, query, modelType = 'openai' } = await req.json();
    
    // Validate inputs
    if (!datasetId || !query) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: datasetId or query' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get dataset information
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', datasetId)
      .single();
      
    if (datasetError) {
      return new Response(
        JSON.stringify({ error: `Failed to get dataset: ${datasetError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Get a preview of the data for analysis
    const { data: fileData, error: storageError } = await supabase.storage
      .from(dataset.storage_type || 'datasets')
      .download(dataset.storage_path);
      
    if (storageError) {
      return new Response(
        JSON.stringify({ error: `Failed to download dataset: ${storageError.message}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Process the data based on model type
    let result;
    
    if (modelType === 'anthropic' && anthropicKey) {
      result = await processWithAnthropic(
        query, 
        dataset, 
        fileData, 
        anthropicKey
      );
    } else {
      // Default to OpenAI if anthropic not specified or key not available
      result = await processWithOpenAI(
        query, 
        dataset, 
        fileData, 
        openaiKey || ''
      );
    }
    
    // Return the result
    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in ai-query function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function processWithOpenAI(query: string, dataset: any, fileData: any, apiKey: string): Promise<any> {
  try {
    // Limit the amount of data to avoid token limits
    const fileText = await fileData.text();
    const filePreview = fileText.split('\n').slice(0, 100).join('\n');
    
    // Prepare the system message based on dataset metadata
    let systemMessage = `You are an AI data analysis assistant. You'll help analyze a dataset and generate appropriate visualizations based on user queries.

Dataset Information:
- Name: ${dataset.name}
- Description: ${dataset.description || 'No description provided'}
- File: ${dataset.file_name}
- Columns: ${JSON.stringify(dataset.column_schema)}

When responding, I need you to:
1. Analyze the data sample I'll provide
2. Choose the most appropriate visualization based on the user's query
3. Return a JSON object with this exact structure:
{
  "data": [array of processed data points for visualization],
  "chartType": "bar" | "line" | "pie" | "scatter",
  "explanation": "Brief explanation of the visualization and insights",
  "chartConfig": {
    "title": "Chart title",
    "xAxisTitle": "X-axis label",
    "yAxisTitle": "Y-axis label"
  }
}

Here's a sample of the data:
\`\`\`
${filePreview}
\`\`\`

Respond with ONLY the requested JSON structure. Do not include any other explanations outside the JSON.`;

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: query }
        ],
        temperature: 0.5,
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    const content = result.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }
    
    // Parse the JSON response
    try {
      const parsedResult = JSON.parse(content);
      return parsedResult;
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.log('Raw response:', content);
      throw new Error('Failed to parse AI response');
    }
    
  } catch (error) {
    console.error('Error processing with OpenAI:', error);
    throw error;
  }
}

async function processWithAnthropic(query: string, dataset: any, fileData: any, apiKey: string): Promise<any> {
  try {
    // Limit the amount of data to avoid token limits
    const fileText = await fileData.text();
    const filePreview = fileText.split('\n').slice(0, 100).join('\n');
    
    // Prepare the system message based on dataset metadata
    let systemMessage = `You are an AI data analysis assistant. You'll help analyze a dataset and generate appropriate visualizations based on user queries.

You'll be working with this dataset:
- Name: ${dataset.name}
- Description: ${dataset.description || 'No description provided'}
- File: ${dataset.file_name}
- Columns: ${JSON.stringify(dataset.column_schema)}

When responding, I need you to:
1. Analyze the data sample I'll provide
2. Choose the most appropriate visualization based on the user's query
3. Return a JSON object with this exact structure:
{
  "data": [array of processed data points for visualization],
  "chartType": "bar" | "line" | "pie" | "scatter",
  "explanation": "Brief explanation of the visualization and insights",
  "chartConfig": {
    "title": "Chart title",
    "xAxisTitle": "X-axis label",
    "yAxisTitle": "Y-axis label"
  }
}

You must return ONLY the requested JSON structure with no markdown formatting or other text.`;

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-7-sonnet-20240620',
        max_tokens: 2000,
        system: systemMessage,
        messages: [
          { role: 'user', 
            content: `Here's a sample of the data:
\`\`\`
${filePreview}
\`\`\`

Based on this data, please analyze this query: "${query}"

Respond with ONLY the requested JSON structure. No other text or explanations.`
          }
        ],
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    const content = result.content?.[0]?.text;
    
    if (!content) {
      throw new Error('Empty response from Anthropic');
    }
    
    // Parse the JSON response (removing any potential markdown formatting)
    try {
      // Strip any markdown code block formatting that Claude might add
      const jsonContent = content.replace(/```json\s*|\s*```/g, '').trim();
      const parsedResult = JSON.parse(jsonContent);
      return parsedResult;
    } catch (parseError) {
      console.error('Failed to parse Anthropic response:', parseError);
      console.log('Raw response:', content);
      throw new Error('Failed to parse AI response');
    }
    
  } catch (error) {
    console.error('Error processing with Anthropic:', error);
    throw error;
  }
}
