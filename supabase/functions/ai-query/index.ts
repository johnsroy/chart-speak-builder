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
    
    // Check if API keys are available
    if ((model === 'openai' && !openaiApiKey) || (model === 'anthropic' && !anthropicApiKey)) {
      throw new Error(`${model.toUpperCase()} API key is not configured. Please contact support.`);
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
    
    // Get the full dataset data instead of just using preview data
    let fullData = previewData;
    if (previewData.length < dataset.row_count) {
      console.log(`Preview data has ${previewData.length} rows but dataset has ${dataset.row_count} rows. Fetching full data...`);
      const { data: completeData, error: dataError } = await supabase
        .from('dataset_data')
        .select('*')
        .eq('dataset_id', datasetId)
        .limit(10000); // Increased limit significantly
      
      if (dataError) {
        console.error('Error fetching full dataset:', dataError);
        
        // Try fetching directly from storage as a fallback
        try {
          console.log('Attempting to fetch data directly from storage');
          if (dataset.storage_path) {
            const { data: fileData, error: fileError } = await supabase
              .storage
              .from('datasets')
              .download(dataset.storage_path);
            
            if (fileError) {
              console.error('Error downloading dataset file:', fileError);
            } else {
              // Parse CSV data
              const text = await fileData.text();
              const parsedData = await parseCSV(text);
              if (parsedData.length > previewData.length) {
                console.log(`Successfully loaded ${parsedData.length} rows from storage`);
                fullData = parsedData;
              }
            }
          }
        } catch (storageError) {
          console.error('Error fetching from storage:', storageError);
        }
      } else if (completeData && completeData.length > previewData.length) {
        console.log(`Successfully fetched ${completeData.length} rows of data`);
        fullData = completeData;
      }
    }
    
    // If still no data, use the preview data
    if (!fullData || fullData.length === 0) {
      console.error('No data available for analysis');
      if (previewData && previewData.length > 0) {
        fullData = previewData;
        console.log(`Falling back to preview data with ${previewData.length} rows`);
      } else {
        throw new Error('Dataset data is required for analysis');
      }
    }

    // Get schema info
    let schema = dataset.column_schema || {};
    
    // If no schema provided, infer it from the full data
    if (!schema || Object.keys(schema).length === 0) {
      schema = inferSchema(fullData[0] || {});
    }
    
    const columnNames = Object.keys(schema).length > 0 
      ? Object.keys(schema) 
      : Object.keys(fullData[0] || {});
    
    console.log(`Using ${fullData.length} rows and ${columnNames.length} columns for analysis`);
    
    // Enhanced prompt for better visualizations and explanations
    const systemPrompt = `
You are an expert data analyst assistant that helps analyze datasets and create insightful visualizations.
Your task is to interpret natural language queries about data and provide detailed, step-by-step analysis with visualization recommendations.

Dataset Information:
- Name: ${dataset.name || 'Unnamed Dataset'}
- Description: ${dataset.description || 'No description provided'}
- Available Columns: ${columnNames.join(', ')}
- Schema: ${JSON.stringify(schema)}
- Sample Data: ${JSON.stringify(fullData.slice(0, 5))}
- Total Rows: ${fullData.length}

Instructions:
1. Carefully analyze the user's query to understand what data insights they're looking for.
2. Think step-by-step about which chart type would best represent this data (bar, line, pie, scatter, area, etc.).
3. Select appropriate columns for x-axis and y-axis based on the data types and query context.
4. Choose color schemes that enhance data visibility and aesthetic appeal.
5. Provide a clear, descriptive title for the visualization.
6. Write a detailed, step-by-step explanation that walks through your analysis process and insights found.
7. Include specific data points, trends, comparisons, and actionable insights in your explanation.
8. For time series data, identify trends, seasonality, and outliers.
9. For categorical data, highlight key differences and patterns across categories.
10. Use sequential reasoning: first analyze the data, then identify patterns, then explain implications.
11. Never include your reasoning process in the response - ONLY return a JSON object.

Return ONLY a JSON object with the following structure:
{
  "chart_type": "bar|line|pie|scatter|area|bubble|column|donut|stacked",
  "x_axis": "column_name",
  "y_axis": "column_name",
  "chart_title": "Descriptive title",
  "color_scheme": "professional|vibrant|pastel|monochrome|gradient",
  "explanation": "Detailed step-by-step explanation of what the visualization shows, including specific data insights and sequential analysis"
}
`;

    // Detect which API to use
    let aiResponse;
    
    if (model === 'anthropic' && anthropicApiKey) {
      console.log('Using Claude API for analysis');
      
      try {
        // Call Anthropic API with Claude 3.7 Sonnet (upgraded from Haiku)
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicApiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-sonnet-20240229',
            max_tokens: 2000,
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
        // Call OpenAI API with upgraded model for better analysis
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
            color_scheme: aiResponse.color_scheme || 'professional',
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
        // Use the full dataset for better visualizations
        const processedData = preprocessData(fullData, aiResponse.x_axis, aiResponse.y_axis, aiResponse.chart_type);
        
        // Calculate additional statistics for richer insights
        const dataStats = calculateDataStats(processedData, aiResponse.y_axis);
        
        // Return the complete response with data
        const result = {
          chart_type: aiResponse.chart_type,
          chartType: aiResponse.chart_type,
          x_axis: aiResponse.x_axis,
          y_axis: aiResponse.y_axis,
          xAxis: aiResponse.x_axis,
          yAxis: aiResponse.y_axis, 
          color_scheme: aiResponse.color_scheme || 'professional',
          chart_title: aiResponse.chart_title || `${aiResponse.y_axis} by ${aiResponse.x_axis}`,
          explanation: aiResponse.explanation || `Visualization showing the relationship between ${aiResponse.x_axis} and ${aiResponse.y_axis} from the ${dataset.name} dataset.`,
          data: processedData,
          columns: columnNames,
          query_id: savedQuery?.id,
          model_used: model === 'anthropic' ? 'Claude 3.7 Sonnet' : 'GPT-4o',
          stats: dataStats
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
    const processedData = preprocessData(fullData, aiResponse.x_axis, aiResponse.y_axis, aiResponse.chart_type);
    const dataStats = calculateDataStats(processedData, aiResponse.y_axis);
    
    // If query saving fails, still return the analysis result
    const result = {
      chart_type: aiResponse.chart_type,
      chartType: aiResponse.chart_type,
      x_axis: aiResponse.x_axis,
      y_axis: aiResponse.y_axis,
      xAxis: aiResponse.x_axis,
      yAxis: aiResponse.y_axis, 
      color_scheme: aiResponse.color_scheme || 'professional',
      chart_title: aiResponse.chart_title || `${aiResponse.y_axis} by ${aiResponse.x_axis}`,
      explanation: aiResponse.explanation || `Visualization showing the relationship between ${aiResponse.x_axis} and ${aiResponse.y_axis} from the ${dataset.name} dataset.`,
      data: processedData,
      columns: columnNames,
      model_used: model === 'anthropic' ? 'Claude 3.7 Sonnet' : 'GPT-4o',
      stats: dataStats
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

// Helper function to parse CSV
async function parseCSV(text: string) {
  const lines = text.split('\n');
  if (lines.length === 0) return [];
  
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
    if (chartType === 'bar' || chartType === 'pie' || chartType === 'donut') {
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
        .slice(0, 20); // Limit to top 20 for readability
    }
    
    // For line charts, sort by date if applicable
    if (chartType === 'line' || chartType === 'area') {
      try {
        const isDateColumn = processedData.some((item: any) => {
          return !isNaN(Date.parse(String(item[xAxis])));
        });
        
        if (isDateColumn) {
          const sorted = processedData
            .sort((a: any, b: any) => {
              return new Date(a[xAxis]).getTime() - new Date(b[xAxis]).getTime();
            });
          
          // If there are too many data points, aggregate by time period
          if (sorted.length > 50) {
            return aggregateTimeSeriesData(sorted, xAxis, yAxis);
          }
          
          return sorted;
        }
      } catch (e) {
        console.error('Error sorting date data:', e);
      }
    }
    
    // For stacked charts, ensure we have category data
    if (chartType === 'stacked') {
      // Find a potential category column
      const columns = Object.keys(processedData[0] || {});
      const categoryColumn = columns.find(col => 
        col !== xAxis && col !== yAxis && 
        typeof processedData[0][col] === 'string'
      );
      
      if (categoryColumn) {
        return processMultiSeriesData(processedData, xAxis, yAxis, categoryColumn);
      }
    }
    
    // For scatter plots or other chart types
    if (chartType === 'scatter' || chartType === 'bubble') {
      // For scatter plots, ensure we have numeric x and y
      return processedData
        .filter((item: any) => {
          const x = Number(item[xAxis]);
          const y = Number(item[yAxis]);
          return !isNaN(x) && !isNaN(y);
        })
        .map((item: any) => ({
          [xAxis]: Number(item[xAxis]),
          [yAxis]: Number(item[yAxis])
        }))
        .slice(0, 200); // Limit points for performance
    }
    
    // For other chart types, just return the processed data
    // but limit to a reasonable number to prevent performance issues
    return processedData.slice(0, 500);
    
  } catch (error) {
    console.error('Error preprocessing data:', error);
    return data.slice(0, 200); // Fallback with limited data
  }
}

// Helper function to aggregate time series data
function aggregateTimeSeriesData(data: any[], xAxis: string, yAxis: string): any[] {
  // Determine time granularity based on data range
  const dates = data.map(item => new Date(item[xAxis]));
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
  const daysDiff = (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24);
  
  let timeFormat: 'day' | 'month' | 'year';
  if (daysDiff <= 60) {
    timeFormat = 'day';
  } else if (daysDiff <= 730) {
    timeFormat = 'month';
  } else {
    timeFormat = 'year';
  }
  
  // Group by time period
  const grouped: Record<string, { sum: number, count: number }> = {};
  
  data.forEach(item => {
    const date = new Date(item[xAxis]);
    let key: string;
    
    if (timeFormat === 'day') {
      key = date.toISOString().split('T')[0]; // YYYY-MM-DD
    } else if (timeFormat === 'month') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
    } else {
      key = `${date.getFullYear()}`; // YYYY
    }
    
    if (!grouped[key]) {
      grouped[key] = { sum: 0, count: 0 };
    }
    
    const value = Number(item[yAxis]) || 0;
    grouped[key].sum += value;
    grouped[key].count += 1;
  });
  
  // Convert back to array and sort chronologically
  return Object.entries(grouped)
    .map(([key, { sum, count }]) => ({
      [xAxis]: key,
      [yAxis]: sum / count, // Average value for the period
      count: count // Keep count for reference
    }))
    .sort((a, b) => {
      // Sort chronologically
      return a[xAxis].localeCompare(b[xAxis]);
    });
}

// Helper function to process multi-series data for stacked charts
function processMultiSeriesData(data: any[], xAxis: string, yAxis: string, categoryColumn: string): any[] {
  // Find unique categories and x values
  const categories = [...new Set(data.map(item => item[categoryColumn]))];
  const xValues = [...new Set(data.map(item => item[xAxis]))];
  
  // Create a properly formatted dataset for stacked charts
  return xValues.map(x => {
    const result: any = { [xAxis]: x };
    
    // For each category, calculate the sum
    categories.forEach(category => {
      const matchingItems = data.filter(item => 
        item[xAxis] === x && item[categoryColumn] === category
      );
      
      const sum = matchingItems.reduce((acc, item) => acc + (Number(item[yAxis]) || 0), 0);
      // Use category name as the key for this series
      result[`${String(category)}`] = sum;
    });
    
    return result;
  });
}

// Helper function to calculate additional statistics for the data
function calculateDataStats(data: any[], yAxis: string): any {
  if (!data || data.length === 0) return null;
  
  try {
    // Extract numeric values
    const values = data.map(item => Number(item[yAxis])).filter(val => !isNaN(val));
    
    if (values.length === 0) return null;
    
    // Calculate basic statistics
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const avg = sum / values.length;
    
    return {
      min,
      max,
      avg,
      sum,
      count: values.length
    };
  } catch (error) {
    console.error('Error calculating data statistics:', error);
    return null;
  }
}
