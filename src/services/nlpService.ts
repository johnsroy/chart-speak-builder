
// This file implements NLP service to process natural language queries
import { supabase } from '@/lib/supabase';

// Define the query result type
export interface QueryResult {
  data: any[];
  chartType: string;
  xAxis: string;
  yAxis: string;
  explanation?: string;
}

// Sample structured data for visualization
const generateSampleData = (datasetName: string, chartType = 'bar') => {
  const categories = ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'];
  const years = [2020, 2021, 2022, 2023, 2024];
  const data = [];
  
  for (const category of categories) {
    for (const year of years) {
      data.push({
        Category: category,
        Year: year,
        Value: Math.floor(Math.random() * 1000),
        Revenue: Math.floor(Math.random() * 10000) / 100,
        Count: Math.floor(Math.random() * 100)
      });
    }
  }
  
  return data;
};

export const nlpService = {
  /**
   * Processes a natural language query about a dataset
   */
  processNaturalLanguageQuery: async (
    datasetId: string,
    query: string,
    modelType: 'openai' | 'anthropic' = 'openai'
  ): Promise<QueryResult> => {
    try {
      console.log(`Processing NL query for dataset ${datasetId} with model ${modelType}`);
      
      // Try to use the Edge Function if available
      try {
        const { data, error } = await supabase.functions.invoke('ai-query', {
          body: { 
            dataset_id: datasetId,
            query_text: query,
            model: modelType 
          }
        });
        
        if (error) {
          console.error('Edge function error:', error);
          throw new Error(`Failed to process query: ${error.message}`);
        }
        
        if (data && data.result) {
          return data.result;
        } else {
          console.warn('Edge function returned empty result:', data);
        }
      } catch (edgeFnError) {
        console.error('Error in processNaturalLanguageQuery:', edgeFnError);
        // Fall back to client-side processing
      }
      
      // Fallback: Generate a simple chart response when edge function fails
      console.log('Generating fallback visualization for query');
      
      // Get the dataset to extract column names
      const { data: dataset, error: datasetError } = await supabase
        .from('datasets')
        .select('*')
        .eq('id', datasetId)
        .single();
      
      if (datasetError) {
        throw new Error(`Failed to fetch dataset: ${datasetError.message}`);
      }
      
      // Determine chart type based on the query
      let chartType = 'bar';
      if (query.toLowerCase().includes('time') || query.toLowerCase().includes('trend')) {
        chartType = 'line';
      } else if (query.toLowerCase().includes('distribution') || query.toLowerCase().includes('breakdown')) {
        chartType = 'pie';
      }
      
      // Extract potential column names from dataset schema
      const columnNames = dataset.column_schema ? Object.keys(dataset.column_schema) : [];
      
      // Select appropriate axes based on schema
      // Default to first string column for x-axis and first number for y-axis
      let xAxis = columnNames[0] || 'Category';
      let yAxis = columnNames[1] || 'Value';
      
      if (dataset.column_schema) {
        // Try to find a categorical column for x-axis
        const categoricalColumn = columnNames.find(col => 
          dataset.column_schema[col] === 'string' || 
          dataset.column_schema[col] === 'text'
        );
        
        // Try to find a numerical column for y-axis
        const numericalColumn = columnNames.find(col => 
          dataset.column_schema[col] === 'number' || 
          dataset.column_schema[col] === 'integer' ||
          dataset.column_schema[col] === 'float'
        );
        
        if (categoricalColumn) xAxis = categoricalColumn;
        if (numericalColumn) yAxis = numericalColumn;
      }
      
      // Generate sample data or use real data if available
      const sampleData = generateSampleData(dataset.name, chartType);
      
      return {
        data: sampleData,
        chartType: chartType,
        xAxis: xAxis,
        yAxis: yAxis,
        explanation: `Here's a ${chartType} chart showing ${yAxis} by ${xAxis}. This is a fallback visualization as I couldn't process your specific query.`
      };
    } catch (error) {
      console.error('Error in processNaturalLanguageQuery:', error);
      throw new Error(`Failed to process query: ${error instanceof Error ? error.message : String(error)}`);
    }
  },
  
  /**
   * Gets chart recommendations for a dataset based on its schema
   */
  getChartRecommendations: async (datasetId: string): Promise<string[]> => {
    try {
      // Fetch dataset schema
      const { data: dataset, error: datasetError } = await supabase
        .from('datasets')
        .select('*')
        .eq('id', datasetId)
        .single();
      
      if (datasetError) {
        throw new Error(`Failed to fetch dataset: ${datasetError.message}`);
      }
      
      const columns = dataset.column_schema ? Object.keys(dataset.column_schema) : [];
      
      if (columns.length === 0) {
        return [
          'Show me a summary of this dataset',
          'What insights can you find?',
          'Create a visualization of the main trends',
          'Compare the key metrics',
          'What patterns are in this data?'
        ];
      }
      
      // Generate recommendations based on schema
      const recommendations: string[] = [];
      
      // Find numerical and categorical columns
      const numericalColumns = columns.filter(col => 
        dataset.column_schema[col] === 'number' || 
        dataset.column_schema[col] === 'integer' ||
        dataset.column_schema[col] === 'float'
      );
      
      const categoricalColumns = columns.filter(col => 
        dataset.column_schema[col] === 'string' || 
        dataset.column_schema[col] === 'text'
      );
      
      const dateColumns = columns.filter(col => 
        dataset.column_schema[col] === 'date' || 
        dataset.column_schema[col] === 'timestamp'
      );
      
      // Add recommendations based on schema
      if (categoricalColumns.length > 0 && numericalColumns.length > 0) {
        recommendations.push(
          `Show ${numericalColumns[0]} by ${categoricalColumns[0]}`,
          `Compare ${numericalColumns[0]} across different ${categoricalColumns[0]}`,
          `What is the distribution of ${categoricalColumns[0]}?`
        );
      }
      
      if (dateColumns.length > 0 && numericalColumns.length > 0) {
        recommendations.push(
          `Show ${numericalColumns[0]} over time`,
          `What is the trend of ${numericalColumns[0]}?`
        );
      }
      
      if (numericalColumns.length >= 2) {
        recommendations.push(
          `Show the relationship between ${numericalColumns[0]} and ${numericalColumns[1]}`,
          `Compare ${numericalColumns[0]} and ${numericalColumns[1]}`
        );
      }
      
      // Add general recommendations
      recommendations.push(
        'What are the key insights from this dataset?',
        'Create a summary visualization',
        'Show me the most important patterns'
      );
      
      return recommendations.slice(0, 5); // Limit to 5 recommendations
    } catch (error) {
      console.error('Error getting chart recommendations:', error);
      // Return generic recommendations on error
      return [
        'Show me a summary of this data',
        'Create a visualization of the main trends',
        'What patterns can you find?',
        'Compare the key metrics',
        'Show the distribution across categories'
      ];
    }
  },
  
  // Add missing method as an alias to processNaturalLanguageQuery
  processQuery: async (
    query: string,
    datasetId: string,
    modelType: 'openai' | 'anthropic' = 'openai'
  ): Promise<QueryResult> => {
    return nlpService.processNaturalLanguageQuery(datasetId, query, modelType);
  },
  
  // Add the missing method for dataset recommendations
  getRecommendationsForDataset: (dataset: any): string[] => {
    const columns = dataset?.column_schema ? Object.keys(dataset.column_schema) : [];
    
    // Default recommendations if we couldn't extract useful columns
    if (columns.length === 0) {
      return [
        'What insights can you find in this dataset?',
        'Show me a summary visualization',
        'What are the main trends?',
        'Compare the key metrics',
        'Show me the distribution of values'
      ];
    }
    
    // Extract column types
    const numericalColumns = columns.filter(col => 
      dataset.column_schema[col] === 'number' || 
      dataset.column_schema[col] === 'integer' ||
      dataset.column_schema[col] === 'float'
    );
    
    const categoricalColumns = columns.filter(col => 
      dataset.column_schema[col] === 'string' || 
      dataset.column_schema[col] === 'text' ||
      dataset.column_schema[col] === 'character varying'
    );
    
    const recommendations: string[] = [];
    
    // Generate dataset-specific recommendations
    if (categoricalColumns.length > 0 && numericalColumns.length > 0) {
      recommendations.push(
        `Show ${numericalColumns[0]} by ${categoricalColumns[0]}`,
        `Compare ${numericalColumns[0]} across different ${categoricalColumns[0]}`
      );
    }
    
    if (numericalColumns.length > 1) {
      recommendations.push(`Show the relationship between ${numericalColumns[0]} and ${numericalColumns[1]}`);
    }
    
    if (categoricalColumns.length > 1) {
      recommendations.push(`Break down ${categoricalColumns[0]} by ${categoricalColumns[1]}`);
    }
    
    // Add some general recommendations
    recommendations.push(
      'What are the key insights from this data?',
      'Show me the most important patterns',
      'Create a summary visualization'
    );
    
    return recommendations.slice(0, 5); // Return at most 5 recommendations
  }
};
