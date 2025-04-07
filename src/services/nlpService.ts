
import { supabase } from '@/lib/supabase';
import { QueryResult } from './types/queryTypes';

// Processing NL query 
export const processNLQuery = async (
  datasetId: string,
  query: string,
  model: 'openai' | 'anthropic' = 'openai'
): Promise<QueryResult> => {
  try {
    console.log(`Calling AI query function for dataset ${datasetId} with model ${model}`);
    const response = await supabase.functions.invoke('ai-query', {
      body: { 
        datasetId, 
        query,
        model 
      }
    });
    
    if (response.error) {
      console.error('AI Query function error:', response.error);
      throw new Error(response.error.message || 'Error processing query');
    }
    
    console.log('AI query response:', response.data);
    
    // Normalize property names for consistency
    const result = response.data as QueryResult;
    if (result.x_axis && !result.xAxis) {
      result.xAxis = result.x_axis;
    }
    if (result.y_axis && !result.yAxis) {
      result.yAxis = result.y_axis;
    }
    if (result.chart_type && !result.chartType) {
      result.chartType = result.chart_type;
    }
    
    return result;
  } catch (error) {
    console.error('Error in NLP query:', error);
    return {
      data: [],
      columns: [],
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
};

// NLP service with additional helper functions
export const nlpService = {
  processQuery: async (query: string, datasetId: string, model: 'openai' | 'anthropic' = 'openai'): Promise<QueryResult> => {
    try {
      console.log(`Processing query using ${model} model: "${query}"`);
      // Process query through Edge function
      const result = await processNLQuery(datasetId, query, model);
      return result;
    } catch (error) {
      console.error('Error processing query:', error);
      throw error;
    }
  },

  getRecommendationsForDataset: (dataset: any): string[] => {
    // Generate dataset-specific query recommendations
    const recommendations = [
      "Show me a summary of the main trends",
      "Create a breakdown by category",
      "Compare the top values in this dataset",
      "Show the distribution across regions",
      "What patterns can you find in this data?"
    ];
    
    // If we have dataset schema, make more specific recommendations
    if (dataset && dataset.column_schema) {
      const columns = Object.keys(dataset.column_schema);
      
      // Look for date columns to suggest time analysis
      const dateColumns = columns.filter(col => 
        dataset.column_schema[col] === 'date' || 
        col.toLowerCase().includes('date') || 
        col.toLowerCase().includes('time') ||
        col.toLowerCase().includes('year')
      );
      
      if (dateColumns.length > 0) {
        recommendations.push(`Show trends over time using ${dateColumns[0]}`);
      }
      
      // Look for categorical columns to suggest breakdowns
      const categoryColumns = columns.filter(col => 
        dataset.column_schema[col] === 'string' && 
        !col.toLowerCase().includes('id') &&
        !col.toLowerCase().includes('name')
      );
      
      if (categoryColumns.length > 0) {
        recommendations.push(`Show distribution by ${categoryColumns[0]}`);
      }
      
      // Look for numeric columns to suggest aggregations
      const numericColumns = columns.filter(col => 
        dataset.column_schema[col] === 'number' || 
        dataset.column_schema[col] === 'integer'
      );
      
      if (numericColumns.length > 0) {
        recommendations.push(`What's the average ${numericColumns[0]} by category?`);
      }
    }
    
    return recommendations;
  },

  // Get previous queries for a dataset
  getPreviousQueries: async (datasetId: string): Promise<any[]> => {
    try {
      const { data, error } = await supabase
        .from('queries')
        .select('*')
        .eq('dataset_id', datasetId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching previous queries:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching previous queries:', error);
      return [];
    }
  },

  // Get a specific query by ID
  getQueryById: async (queryId: string): Promise<any> => {
    try {
      const { data, error } = await supabase
        .from('queries')
        .select('*')
        .eq('id', queryId)
        .single();

      if (error) {
        console.error('Error fetching query:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching query:', error);
      return null;
    }
  }
};

// Update exports to use the common QueryResult type
export type { QueryResult };
