
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query, dataset_id, dataset_name, column_schema } = await req.json();

    if (!query || !dataset_id) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required parameters: query and dataset_id are required" 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 400 
        }
      );
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" }, 
          status: 500 
        }
      );
    }

    // Get the column types information
    const columnsInfo = column_schema ? 
      Object.entries(column_schema).map(([name, type]) => `${name} (${type})`).join(", ") : 
      "No column information available";

    // Construct system prompt
    const systemContent = `You are an AI data analyst specialized in analyzing datasets. 
    You will receive queries about a dataset named "${dataset_name}" with columns: ${columnsInfo}.
    Your task is to analyze the query and provide a JSON response with instructions on how to visualize this data. 
    Think carefully about what chart type would be most appropriate for the query.
    
    For the response, provide a JSON object with the following fields:
    - chart_type: The type of chart to use (bar, line, pie, scatter)
    - x_axis: The column to use for the x-axis 
    - y_axis: The column to use for the y-axis
    - chart_title: A descriptive title for the chart
    - chart_subtitle (optional): A subtitle providing context
    - explanation: A brief explanation of the data insights
    - x_axis_title (optional): Label for x-axis
    - y_axis_title (optional): Label for y-axis
    
    Format your response as valid JSON only, nothing else.`;

    // Send request to OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: query }
        ],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("OpenAI API error:", error);
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const result = await response.json();
    
    // Extract and parse the response content
    let analysisResult;
    try {
      const content = result.choices[0].message.content;
      // Try to parse the JSON response
      analysisResult = JSON.parse(content);
    } catch (e) {
      console.error("Error parsing OpenAI response:", e);
      throw new Error("Failed to parse AI response");
    }

    // Generate dummy data for demonstration (in a real app, you'd use real data)
    const mockData = generateMockData(
      analysisResult.chart_type,
      analysisResult.x_axis,
      analysisResult.y_axis,
      column_schema
    );

    // Return the analysis result with mock data
    return new Response(
      JSON.stringify({
        ...analysisResult,
        data: mockData,
        columns: ["x_value", "y_value"]
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing AI query:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unknown error occurred" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 500 
      }
    );
  }
});

// Helper function to generate mock data for demonstration
function generateMockData(chartType: string, xAxis: string, yAxis: string, columnSchema: any) {
  const data = [];
  
  // Generate sample values based on the column type
  const xAxisType = columnSchema?.[xAxis] || "string";
  const yAxisType = columnSchema?.[yAxis] || "number";
  
  // Categories for categorical data
  const categories = ["Category A", "Category B", "Category C", "Category D", "Category E"];
  
  for (let i = 0; i < 5; i++) {
    let xValue;
    
    // Generate appropriate x-axis values based on type
    if (xAxisType === "date") {
      // Generate dates within the last month
      const date = new Date();
      date.setDate(date.getDate() - i * 7);
      xValue = date.toISOString().split('T')[0];
    } else if (xAxisType === "number" || xAxisType === "integer") {
      xValue = i * 10;
    } else {
      // Default to categorical
      xValue = categories[i];
    }
    
    // Generate y-axis values (typically numeric)
    const yValue = Math.floor(Math.random() * 100) + 10;
    
    data.push({
      [xAxis]: xValue,
      [yAxis]: yValue
    });
  }
  
  return data;
}
