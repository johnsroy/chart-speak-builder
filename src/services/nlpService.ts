import { supabase } from '@/lib/supabase';

export interface QueryResult {
  data: any[];
  chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'table';
  explanation: string;
  chartConfig: {
    title: string;
    xAxisTitle?: string;
    yAxisTitle?: string;
    [key: string]: any;
  };
}

export interface ChartRecommendation {
  title: string;
  description: string;
  query: string;
}

export const nlpService = {
  /**
   * Processes a natural language query about a dataset using AI.
   * @param datasetId The ID of the dataset to query.
   * @param query The natural language query string.
   * @param modelType The AI model to use: 'openai' or 'anthropic'.
   * @returns A promise that resolves with the query result.
   */
  processNaturalLanguageQuery: async (
    datasetId: string, 
    query: string,
    modelType: 'openai' | 'anthropic' = 'openai'
  ): Promise<QueryResult> => {
    try {
      console.log(`Processing NL query for dataset ${datasetId}:`, query);
      
      // Call the AI Query edge function
      const { data, error } = await supabase.functions.invoke('ai-query', {
        body: { datasetId, query, modelType }
      });
      
      if (error) {
        console.error('Error processing query:', error);
        throw new Error(`Failed to process query: ${error.message}`);
      }
      
      console.log('Query processed successfully:', data);
      
      // Ensure the response has the expected structure
      if (!data || !data.data || !data.chartType) {
        console.error('Invalid response format:', data);
        throw new Error('The AI returned an invalid response format');
      }
      
      // Validate the data format
      return {
        data: data.data,
        chartType: data.chartType,
        explanation: data.explanation || 'No explanation provided',
        chartConfig: data.chartConfig || {
          title: 'Data Visualization',
          xAxisTitle: '',
          yAxisTitle: ''
        }
      };
    } catch (error) {
      console.error('Error in processNaturalLanguageQuery:', error);
      
      // Return a fallback response with an error message
      return {
        data: [],
        chartType: 'bar',
        explanation: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        chartConfig: {
          title: 'Error Visualizing Data',
          xAxisTitle: '',
          yAxisTitle: ''
        }
      };
    }
  },
  
  /**
   * Generates chart recommendations based on a dataset.
   * @param datasetId The ID of the dataset.
   * @returns A promise that resolves with an array of chart recommendations.
   */
  getChartRecommendations: async (datasetId: string): Promise<ChartRecommendation[]> => {
    try {
      // Get dataset details
      const { data: dataset, error: datasetError } = await supabase
        .from('datasets')
        .select('*')
        .eq('id', datasetId)
        .single();
      
      if (datasetError) {
        throw new Error(`Failed to get dataset: ${datasetError.message}`);
      }
      
      // If the dataset has a schema, use it to generate recommendations
      if (dataset.column_schema && Object.keys(dataset.column_schema).length > 0) {
        return generateRecommendationsFromSchema(dataset);
      }
      
      // Otherwise return generic recommendations
      return generateGenericRecommendations(dataset.name);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      
      // Return some generic recommendations as fallback
      return [
        {
          title: 'General Overview',
          description: 'Show a summary of the key metrics in the dataset',
          query: 'Give me an overview of the main trends in this dataset'
        },
        {
          title: 'Data Distribution',
          description: 'Visualize how values are distributed',
          query: 'Show me how the values are distributed in this dataset'
        },
        {
          title: 'Top Values',
          description: 'Find the highest values in the dataset',
          query: 'What are the top 5 highest values in this dataset?'
        }
      ];
    }
  }
};

/**
 * Generates chart recommendations based on the dataset schema.
 */
function generateRecommendationsFromSchema(dataset: any): ChartRecommendation[] {
  const recommendations: ChartRecommendation[] = [];
  const schema = dataset.column_schema;
  
  // Find numeric columns
  const numericColumns = Object.entries(schema)
    .filter(([_, type]) => type === 'number' || type === 'integer')
    .map(([name]) => name);
  
  // Find categorical columns
  const categoricalColumns = Object.entries(schema)
    .filter(([_, type]) => type === 'string')
    .map(([name]) => name);
  
  // Find date columns
  const dateColumns = Object.entries(schema)
    .filter(([_, type]) => type === 'date')
    .map(([name]) => name);
  
  // If we have numeric and categorical columns, suggest bar charts
  if (numericColumns.length > 0 && categoricalColumns.length > 0) {
    const numericCol = numericColumns[0];
    const categoricalCol = categoricalColumns[0];
    
    recommendations.push({
      title: `${categoricalCol} by ${numericCol}`,
      description: `Compare ${numericCol} across different ${categoricalCol} categories`,
      query: `Show me a bar chart of ${numericCol} by ${categoricalCol}`
    });
    
    if (numericColumns.length > 1) {
      recommendations.push({
        title: `${categoricalCol} by multiple metrics`,
        description: `Compare multiple metrics across ${categoricalCol} categories`,
        query: `Create a comparison of ${numericColumns.slice(0, 3).join(', ')} across ${categoricalCol}`
      });
    }
  }
  
  // If we have date columns, suggest trend analysis
  if (dateColumns.length > 0 && numericColumns.length > 0) {
    const dateCol = dateColumns[0];
    const numericCol = numericColumns[0];
    
    recommendations.push({
      title: `${numericCol} trends over time`,
      description: `Analyze how ${numericCol} changes over time`,
      query: `Show me a line chart of ${numericCol} over ${dateCol}`
    });
  }
  
  // If we have multiple numeric columns, suggest correlation
  if (numericColumns.length > 1) {
    recommendations.push({
      title: `Correlation analysis`,
      description: `Explore the relationship between ${numericColumns[0]} and ${numericColumns[1]}`,
      query: `Is there a correlation between ${numericColumns[0]} and ${numericColumns[1]}?`
    });
  }
  
  // If we have categorical columns, suggest distribution
  if (categoricalColumns.length > 0) {
    recommendations.push({
      title: `${categoricalColumns[0]} distribution`,
      description: `See the distribution of ${categoricalColumns[0]} values`,
      query: `Show me the distribution of ${categoricalColumns[0]} as a pie chart`
    });
  }
  
  // Add a generic "top values" recommendation
  if (numericColumns.length > 0 && categoricalColumns.length > 0) {
    recommendations.push({
      title: `Top ${categoricalColumns[0]} by ${numericColumns[0]}`,
      description: `Find the highest ${categoricalColumns[0]} in terms of ${numericColumns[0]}`,
      query: `What are the top 5 ${categoricalColumns[0]} by ${numericColumns[0]}?`
    });
  }
  
  // Add a full dataset recommendation
  recommendations.push({
    title: 'Complete analysis',
    description: 'Get a comprehensive analysis of the entire dataset',
    query: `Analyze this ${dataset.name} dataset and show the most interesting insights`
  });
  
  return recommendations.slice(0, 5); // Limit to 5 recommendations
}

/**
 * Generates generic chart recommendations when no schema is available.
 */
function generateGenericRecommendations(datasetName: string): ChartRecommendation[] {
  return [
    {
      title: 'General Overview',
      description: `Get a summary of the key metrics in the ${datasetName} dataset`,
      query: `Give me an overview of the main trends in this ${datasetName} dataset`
    },
    {
      title: 'Top Categories',
      description: 'Find the most significant categories in the dataset',
      query: 'What are the top categories in this dataset?'
    },
    {
      title: 'Time Series Analysis',
      description: 'Analyze how values change over time',
      query: 'Show me a trend analysis over time from this dataset'
    },
    {
      title: 'Value Distribution',
      description: 'See how values are distributed across the dataset',
      query: 'Create a distribution chart of the main values in this dataset'
    },
    {
      title: 'Comparative Analysis',
      description: 'Compare different metrics or categories',
      query: 'Compare the main categories in this dataset'
    }
  ];
}

/**
 * Processes a value for chart data - ensuring proper numeric conversion when needed
 */
export function processChartValue(value: any): number {
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    const numValue = parseFloat(value);
    return isNaN(numValue) ? 0 : numValue;
  }
  
  return 0;
}

/**
 * Format percent values for display in charts
 */
export function formatPercentValue(percent: number): string {
  return `${(percent * 100).toFixed(0)}%`;
}
