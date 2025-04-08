
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
    const { datasetId, query, model = 'openai', previewData = [] } = await req.json();
    
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
      console.error('Error retrieving dataset:', datasetError);
      throw new Error(`Failed to find dataset: ${datasetError.message}`);
    }
    
    // Ensure we have data to analyze
    if (!previewData || previewData.length === 0) {
      console.error('No preview data provided');
      throw new Error('Dataset preview data is required for analysis');
    }

    // Get schema info
    let schema = dataset.column_schema || {};
    
    // If no schema provided, infer it from the preview data
    if (!schema || Object.keys(schema).length === 0) {
      schema = inferSchema(previewData[0] || {});
    }
    
    const columnNames = Object.keys(schema).length > 0 
      ? Object.keys(schema) 
      : Object.keys(previewData[0] || {});
    
    console.log(`Got ${previewData.length} rows and ${columnNames.length} columns for analysis`);
    
    // Enhanced prompt for better visualizations and explanations
    const systemPrompt = `
You are an expert data analyst assistant that helps analyze datasets and create insightful visualizations.
Your task is to interpret natural language queries about data and provide detailed, step-by-step analysis with visualization recommendations.

Dataset Information:
- Name: ${dataset.name || 'Unnamed Dataset'}
- Description: ${dataset.description || 'No description provided'}
- Available Columns: ${columnNames.join(', ')}
- Schema: ${JSON.stringify(schema)}
- Sample Data: ${JSON.stringify(previewData.slice(0, 5))}
- Total Rows: ${previewData.length}

Instructions:
1. Carefully analyze the user's query to understand what data insights they're looking for.
2. Think step-by-step about which chart type would best represent this data (bar, line, pie, scatter, etc.).
3. Select appropriate columns for x-axis and y-axis based on the data types and query context.
4. Provide a clear, descriptive title for the visualization.
5. Write a detailed, step-by-step explanation that walks through your analysis process and insights found.
6. Include specific data points, trends, comparisons, and actionable insights in your explanation.
7. Use sequential reasoning: first analyze the data, then identify patterns, then explain implications.
8. Never include your reasoning process in the response - ONLY return a JSON object.

Return ONLY a JSON object with the following structure:
{
  "chart_type": "bar|line|pie|scatter",
  "x_axis": "column_name",
  "y_axis": "column_name",
  "chart_title": "Descriptive title",
  "explanation": "Detailed step-by-step explanation of what the visualization shows, including specific data insights and sequential analysis"
}
`;

    // Detect which API to use
    let aiResponse;
    
    if (model === 'anthropic' && anthropicApiKey) {
      console.log('Using Claude API for analysis');
      
      try {
        // Call Anthropic API with Claude 3 Haiku
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicApiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 1500,
            system: systemPrompt,
            messages: [
              { role: 'user', content: query }
            ],
            temperature: 0.2
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Claude API error: Status ${response.status}`, errorText);
          throw new Error(`Claude API error: ${response.status} - ${errorText}`);
        }
        
        const responseData = await response.json();
        
        if (!responseData.content || responseData.content.length === 0) {
          throw new Error('Empty response from Claude API');
        }
        
        const claudeResponse = responseData.content[0].text;
        
        // Extract JSON from Claude's response
        try {
          // Use a regex to extract JSON from any surrounding text Claude might add
          const jsonMatch = claudeResponse.match(/\{.*\}/s);
          if (!jsonMatch) {
            throw new Error('No valid JSON found in Claude response');
          }
          aiResponse = JSON.parse(jsonMatch[0]);
        } catch (err) {
          console.error('Error parsing Claude JSON response:', err);
          throw new Error('Invalid response format from Claude API');
        }
      } catch (claudeError) {
        console.error('Claude API error:', claudeError);
        throw new Error(`Claude API failed: ${claudeError.message}`);
      }
    } 
    else if (openaiApiKey) {
      console.log('Using OpenAI GPT-4o API for analysis');
      
      try {
        // Call OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: query }
            ],
            temperature: 0.2,
            response_format: { type: "json_object" }
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`OpenAI API error: Status ${response.status}`, errorText);
          throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }
        
        const responseData = await response.json();
        
        if (!responseData.choices || responseData.choices.length === 0) {
          throw new Error('Empty response from OpenAI API');
        }
        
        const openaiResponse = responseData.choices[0].message.content;
        
        // Extract JSON from OpenAI's response
        try {
          aiResponse = JSON.parse(openaiResponse);
        } catch (err) {
          console.error('Error parsing OpenAI JSON response:', err);
          throw new Error('Invalid response format from OpenAI API');
        }
      } catch (openaiError) {
        console.error('OpenAI API error:', openaiError);
        throw new Error(`OpenAI API failed: ${openaiError.message}`);
      }
    } 
    else {
      throw new Error('No API keys available for AI analysis');
    }
    
    // Validate AI response
    if (!aiResponse.chart_type || !aiResponse.x_axis || !aiResponse.y_axis) {
      console.error('Invalid AI response format:', aiResponse);
      throw new Error('AI returned incomplete analysis results');
    }
    
    // Get user ID from dataset
    const userId = dataset.user_id;
    
    // Save the query to Supabase for history tracking
    try {
      const { data: savedQuery, error: saveError } = await supabase
        .from('queries')
        .insert({
          dataset_id: datasetId,
          query_text: query,
          query_type: model,
          name: aiResponse.chart_title || 'Untitled Query',
          user_id: userId,
          query_config: {
            model: model,
            chart_type: aiResponse.chart_type,
            x_axis: aiResponse.x_axis,
            y_axis: aiResponse.y_axis,
            timestamp: new Date().toISOString(),
            user_query: query,
            result: aiResponse
          }
        })
        .select()
        .single();
        
      if (saveError) {
        console.error('Error saving query:', saveError);
      } else {
        console.log('Saved query with ID:', savedQuery.id);
        
        // Ensure data is properly formatted for visualization
        const processedData = preprocessData(previewData, aiResponse.x_axis, aiResponse.y_axis, aiResponse.chart_type);
        
        // Return the complete response with data
        const result = {
          chart_type: aiResponse.chart_type,
          chartType: aiResponse.chart_type,
          x_axis: aiResponse.x_axis,
          y_axis: aiResponse.y_axis,
          xAxis: aiResponse.x_axis,
          yAxis: aiResponse.y_axis, 
          chart_title: aiResponse.chart_title || `${aiResponse.y_axis} by ${aiResponse.x_axis}`,
          explanation: aiResponse.explanation || `Visualization showing the relationship between ${aiResponse.x_axis} and ${aiResponse.y_axis} from the ${dataset.name} dataset.`,
          data: processedData,
          columns: columnNames,
          query_id: savedQuery?.id,
          model_used: model === 'anthropic' ? 'Claude 3 Haiku' : 'GPT-4o'
        };
        
        console.log(`Analysis complete: Chart type=${result.chart_type}, x=${result.x_axis}, y=${result.y_axis}`);
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } catch (queryError) {
      console.error('Error in query saving process:', queryError);
    }
    
    // Ensure data is properly formatted for visualization even if saving fails
    const processedData = preprocessData(previewData, aiResponse.x_axis, aiResponse.y_axis, aiResponse.chart_type);
    
    // If query saving fails, still return the analysis result
    const result = {
      chart_type: aiResponse.chart_type,
      chartType: aiResponse.chart_type,
      x_axis: aiResponse.x_axis,
      y_axis: aiResponse.y_axis,
      xAxis: aiResponse.x_axis,
      yAxis: aiResponse.y_axis, 
      chart_title: aiResponse.chart_title || `${aiResponse.y_axis} by ${aiResponse.x_axis}`,
      explanation: aiResponse.explanation || `Visualization showing the relationship between ${aiResponse.x_axis} and ${aiResponse.y_axis} from the ${dataset.name} dataset.`,
      data: processedData,
      columns: columnNames,
      model_used: model === 'anthropic' ? 'Claude 3 Haiku' : 'GPT-4o'
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
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
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

// Helper function to preprocess data for better visualization
function preprocessData(data: any[], xAxis: string, yAxis: string, chartType: string): any[] {
  if (!data || data.length === 0) {
    return [];
  }
  
  try {
    // Make a deep copy to avoid mutating the original data
    const processedData = JSON.parse(JSON.stringify(data));
    
    // For bar and pie charts, aggregate data by category
    if (chartType === 'bar' || chartType === 'pie') {
      // Group data by x-axis values and sum y-axis values
      const aggregated: Record<string, number> = {};
      
      processedData.forEach((item: any) => {
        const key = String(item[xAxis] || 'Unknown');
        const value = Number(item[yAxis] || 0);
        
        if (aggregated[key] === undefined) {
          aggregated[key] = 0;
        }
        aggregated[key] += value;
      });
      
      // Convert back to array format
      return Object.entries(aggregated)
        .map(([key, value]) => ({ [xAxis]: key, [yAxis]: value }))
        .sort((a, b) => (b[yAxis] as number) - (a[yAxis] as number))
        .slice(0, 15); // Limit to top 15 for readability
    }
    
    // For line charts, sort by date if applicable
    if (chartType === 'line') {
      try {
        const isDateColumn = processedData.every((item: any) => {
          return !isNaN(Date.parse(String(item[xAxis])));
        });
        
        if (isDateColumn) {
          return processedData
            .sort((a: any, b: any) => {
              return new Date(a[xAxis]).getTime() - new Date(b[xAxis]).getTime();
            });
        }
      } catch (e) {
        console.error('Error sorting date data:', e);
      }
    }
    
    // For scatter plots or other chart types
    return processedData;
  } catch (error) {
    console.error('Error preprocessing data:', error);
    return data;
  }
}
