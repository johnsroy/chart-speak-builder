
import { supabase } from '@/lib/supabase';
import { dataService } from './dataService';

export interface QueryResult {
  data: any[];
  chartType: string;
  explanation: string;
  chartConfig: {
    title: string;
    subtitle?: string;
    xAxisTitle?: string;
    yAxisTitle?: string;
    xAxis?: string;
    yAxis?: string;
  };
}

export const nlpService = {
  /**
   * Process a natural language query against a dataset
   * @param datasetId The ID of the dataset to query
   * @param query The natural language query
   * @param modelType The model to use for processing (openai or anthropic)
   * @returns A query result containing visualization data
   */
  processNaturalLanguageQuery: async (
    datasetId: string,
    query: string,
    modelType: 'openai' | 'anthropic' = 'openai'
  ): Promise<QueryResult> => {
    try {
      console.log(`Processing NL query for dataset ${datasetId} with model ${modelType}`);
      
      const { data, error } = await supabase.functions.invoke('ai-query', {
        body: { 
          datasetId,
          query,
          modelType 
        }
      });
      
      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Failed to process query: ${error.message}`);
      }
      
      if (!data) {
        throw new Error('Empty response from AI service');
      }
      
      console.log('NLP service received response:', data);
      
      // Validate and ensure all required fields are present
      if (!data.data || !Array.isArray(data.data) || !data.chartType) {
        console.error('Invalid response format from AI service:', data);
        throw new Error('Invalid response format from AI service');
      }
      
      // Ensure numeric values are properly parsed
      if (data.data.length > 0) {
        data.data = data.data.map(item => {
          const newItem: Record<string, any> = {};
          
          for (const [key, value] of Object.entries(item)) {
            if (typeof value === 'string' && !isNaN(Number(value))) {
              newItem[key] = Number(value);
            } else {
              newItem[key] = value;
            }
          }
          
          return newItem;
        });
      }
      
      return {
        data: data.data,
        chartType: data.chartType,
        explanation: data.explanation || '',
        chartConfig: data.chartConfig || {
          title: 'Data Visualization',
          xAxisTitle: '',
          yAxisTitle: ''
        }
      };
    } catch (error) {
      console.error('Error in processNaturalLanguageQuery:', error);
      throw error;
    }
  },
  
  /**
   * Process a query (alias for processNaturalLanguageQuery for backward compatibility)
   */
  processQuery: async (
    query: string,
    datasetId: string,
    modelType: 'openai' | 'anthropic' = 'openai'
  ): Promise<QueryResult> => {
    return nlpService.processNaturalLanguageQuery(datasetId, query, modelType);
  },
  
  /**
   * Get chart recommendations for a dataset
   * @param datasetId The ID of the dataset
   * @returns An array of chart recommendations with query, title, and description
   */
  getChartRecommendations: async (datasetId: string): Promise<Array<{
    query: string;
    title: string;
    description: string;
    chartType: string;
  }>> => {
    try {
      // Get dataset info first to make informed suggestions
      const dataset = await dataService.getDataset(datasetId);
      
      if (!dataset || !dataset.column_schema || Object.keys(dataset.column_schema).length === 0) {
        // Default recommendations for unknown schema
        return [
          {
            query: "Show me a summary of the data",
            title: "Data Summary",
            description: "Overview of key data points",
            chartType: "bar"
          },
          {
            query: "What are the main categories in the dataset?",
            title: "Category Breakdown",
            description: "Distribution across categories",
            chartType: "pie"
          },
          {
            query: "Show trends over time if there is time data",
            title: "Time Trends",
            description: "Changes over time periods",
            chartType: "line"
          },
          {
            query: "Show the distribution of numeric values",
            title: "Value Distribution",
            description: "Range and frequency of values",
            chartType: "bar"
          },
          {
            query: "Show the top 5 highest values",
            title: "Top Values",
            description: "Highest ranking items",
            chartType: "bar"
          }
        ];
      }
      
      // Generate dataset-specific recommendations based on schema
      // This would be more sophisticated in a real implementation
      const columns = Object.keys(dataset.column_schema);
      const numericColumns = columns.filter(col => 
        dataset.column_schema[col] === 'number' || 
        dataset.column_schema[col] === 'integer'
      );
      const categoricalColumns = columns.filter(col => 
        dataset.column_schema[col] === 'string'
      );
      const dateColumns = columns.filter(col => 
        dataset.column_schema[col] === 'date' || 
        dataset.column_schema[col] === 'timestamp'
      );
      
      const recommendations = [];
      
      if (categoricalColumns.length > 0 && numericColumns.length > 0) {
        recommendations.push({
          query: `Show a breakdown of ${numericColumns[0]} by ${categoricalColumns[0]}`,
          title: `${numericColumns[0]} by ${categoricalColumns[0]}`,
          description: `Compare ${numericColumns[0]} across different ${categoricalColumns[0]} categories`,
          chartType: "bar"
        });
      }
      
      if (dateColumns.length > 0 && numericColumns.length > 0) {
        recommendations.push({
          query: `Show the trend of ${numericColumns[0]} over time`,
          title: `${numericColumns[0]} Trend`,
          description: `Changes in ${numericColumns[0]} across time periods`,
          chartType: "line"
        });
      }
      
      if (categoricalColumns.length > 0) {
        recommendations.push({
          query: `Show the distribution of ${categoricalColumns[0]}`,
          title: `${categoricalColumns[0]} Distribution`,
          description: `Breakdown of ${categoricalColumns[0]} categories`,
          chartType: "pie"
        });
      }
      
      if (numericColumns.length > 0) {
        recommendations.push({
          query: `Show the top 5 highest ${numericColumns[0]} values`,
          title: `Top ${numericColumns[0]} Values`,
          description: `Highest ranking items by ${numericColumns[0]}`,
          chartType: "bar"
        });
      }
      
      // Add a general analysis recommendation
      recommendations.push({
        query: `What are the key insights from this dataset?`,
        title: `Key Insights`,
        description: `Important patterns and findings in the data`,
        chartType: "bar"
      });
      
      return recommendations;
    } catch (error) {
      console.error('Error getting chart recommendations:', error);
      
      // Return default recommendations on error
      return [
        {
          query: "Summarize this dataset",
          title: "Data Summary",
          description: "Overview of the dataset",
          chartType: "bar"
        },
        {
          query: "Show me the main trends",
          title: "Key Trends",
          description: "Important patterns in the data",
          chartType: "line"
        }
      ];
    }
  },

  /**
   * Generate recommendations for a specific dataset
   * @param dataset The dataset object
   * @returns Array of query string recommendations
   */
  getRecommendationsForDataset: (dataset: any): string[] => {
    if (!dataset || !dataset.column_schema) {
      return [
        "Show me a summary of this dataset",
        "What are the key insights from this data?",
        "Create a visualization of the main trends",
        "Compare the top values in this dataset",
        "Find patterns in this dataset"
      ];
    }
    
    const columns = Object.keys(dataset.column_schema);
    const recommendations: string[] = [];
    
    // Find numeric and categorical columns
    const numericColumns = columns.filter(col => 
      dataset.column_schema[col] === 'number' || 
      dataset.column_schema[col] === 'integer'
    );
    
    const categoricalColumns = columns.filter(col => 
      dataset.column_schema[col] === 'string' ||
      col.toLowerCase().includes('category') ||
      col.toLowerCase().includes('type')
    );
    
    const dateColumns = columns.filter(col => 
      dataset.column_schema[col] === 'date' ||
      col.toLowerCase().includes('date') ||
      col.toLowerCase().includes('time') ||
      col.toLowerCase().includes('year')
    );
    
    // Generate data-specific recommendations
    if (categoricalColumns.length > 0 && numericColumns.length > 0) {
      recommendations.push(`Show me a breakdown of ${numericColumns[0]} by ${categoricalColumns[0]}`);
      recommendations.push(`What is the distribution of ${categoricalColumns[0]}?`);
    }
    
    if (dateColumns.length > 0 && numericColumns.length > 0) {
      recommendations.push(`Show the trend of ${numericColumns[0]} over time`);
      recommendations.push(`How has ${numericColumns[0]} changed over ${dateColumns[0]}?`);
    }
    
    if (numericColumns.length > 1) {
      recommendations.push(`Is there a correlation between ${numericColumns[0]} and ${numericColumns[1]}?`);
    }
    
    // Add some general recommendations
    recommendations.push(`What are the key insights from this dataset?`);
    recommendations.push(`Show me the most interesting patterns in this data`);
    
    // Ensure we have at least 5 recommendations
    if (recommendations.length < 5) {
      recommendations.push(`Summarize this dataset visually`);
      recommendations.push(`What are the outliers in this dataset?`);
      recommendations.push(`Show me the most important relationships in this data`);
    }
    
    // Return the first 5 recommendations (or all if less than 5)
    return recommendations.slice(0, 5);
  }
};
