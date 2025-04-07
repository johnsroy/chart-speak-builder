
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
    const { datasetId, query, model = 'openai' } = await req.json();
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    
    console.log(`Processing NL query for dataset ${datasetId} using ${model} model`);
    
    if (!datasetId) {
      throw new Error('Dataset ID is required');
    }
    
    if (!query || query.trim() === '') {
      throw new Error('Query text is required');
    }
    
    // Connect to Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get dataset info
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', datasetId)
      .single();
      
    if (datasetError) {
      throw new Error(`Failed to find dataset: ${datasetError.message}`);
    }
    
    // Get the dataset data preview
    const { data: preview, error: previewError } = await supabase.functions.invoke('data-processor', {
      body: { action: 'preview', dataset_id: datasetId }
    });
    
    if (previewError) {
      throw new Error(`Failed to get dataset preview: ${previewError.message}`);
    }
    
    // Prepare the data for analysis
    const dataToAnalyze = preview?.data || [];
    const schema = dataset.column_schema || {};
    const columnNames = Object.keys(schema);
    
    console.log(`Got ${dataToAnalyze.length} rows and ${columnNames.length} columns for analysis`);
    
    // Create a prompt for the AI
    const systemPrompt = `
You are an expert data analyst assistant that helps analyze datasets and suggest visualizations.
Your task is to interpret natural language queries about data and provide visualization recommendations.

Dataset Information:
- Name: ${dataset.name || 'Unnamed Dataset'}
- Description: ${dataset.description || 'No description provided'}
- Available Columns: ${columnNames.join(', ')}
- Schema: ${JSON.stringify(schema)}
- Sample Data: ${JSON.stringify(dataToAnalyze.slice(0, 3))}

Instructions:
1. Analyze the user's query to understand what visualization they want.
2. Determine the most appropriate chart type (bar, line, pie, scatter, etc.) based on the query and data.
3. Select appropriate columns for x-axis and y-axis based on the data types.
4. Provide a descriptive title and brief explanation for the visualization.
5. Never include your reasoning or explanations in the response - ONLY return a JSON object.

Return ONLY a JSON object with the following structure:
{
  "chart_type": "bar|line|pie|scatter",
  "x_axis": "column_name",
  "y_axis": "column_name",
  "chart_title": "Descriptive title",
  "explanation": "Brief explanation of what the visualization shows"
}
`;

    // Detect which API to use
    let aiResponse;
    
    if (model === 'anthropic' && anthropicApiKey) {
      console.log('Using Claude API for analysis');
      
      // Call Anthropic API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1000,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query }
          ]
        })
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(`Claude API error: ${responseData.error?.message || JSON.stringify(responseData)}`);
      }
      
      const claudeResponse = responseData.content[0].text;
      
      // Extract JSON from Claude's response
      try {
        aiResponse = JSON.parse(claudeResponse.match(/\{.*\}/s)[0]);
      } catch (err) {
        console.error('Error parsing Claude JSON response:', err);
        throw new Error('Invalid response format from Claude API');
      }
    } 
    else if (openaiApiKey) {
      console.log('Using OpenAI API for analysis');
      
      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query }
          ],
          temperature: 0.3,
        })
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${responseData.error?.message || JSON.stringify(responseData)}`);
      }
      
      const openaiResponse = responseData.choices[0].message.content;
      
      // Extract JSON from OpenAI's response
      try {
        aiResponse = JSON.parse(openaiResponse);
      } catch (err) {
        console.error('Error parsing OpenAI JSON response:', err);
        throw new Error('Invalid response format from OpenAI API');
      }
    } 
    else {
      throw new Error('No API keys available for AI analysis');
    }
    
    // Validate AI response
    if (!aiResponse.chart_type || !aiResponse.x_axis || !aiResponse.y_axis) {
      throw new Error('Invalid AI response format - missing required fields');
    }
    
    // Return the complete response with data
    const result = {
      chart_type: aiResponse.chart_type,
      x_axis: aiResponse.x_axis,
      y_axis: aiResponse.y_axis,
      chart_title: aiResponse.chart_title || `${aiResponse.y_axis} by ${aiResponse.x_axis}`,
      explanation: aiResponse.explanation || `Visualization showing the relationship between ${aiResponse.x_axis} and ${aiResponse.y_axis} from the ${dataset.name} dataset.`,
      data: dataToAnalyze,
      columns: columnNames
    };
    
    console.log(`Analysis complete: Chart type=${result.chart_type}, x=${result.x_axis}, y=${result.y_axis}`);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in AI query function:', error);
    
    // Provide a more detailed error response
    return new Response(
      JSON.stringify({
        error: error.message || 'An unknown error occurred',
        data: [],
        columns: []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
