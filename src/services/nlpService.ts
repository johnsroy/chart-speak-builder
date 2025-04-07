import { supabase } from '@/lib/supabase';
import { QueryResult } from './types/queryTypes';
import { toast } from 'sonner';
import { dataService } from '@/services/dataService';

// Processing NL query with fallback mechanism for when edge functions fail
export const processNLQuery = async (
  datasetId: string,
  query: string,
  model: 'openai' | 'anthropic' = 'openai'
): Promise<QueryResult> => {
  try {
    console.log(`Calling AI query function for dataset ${datasetId} with model ${model}`);
    
    // First ensure we can access the dataset
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', datasetId)
      .single();
      
    if (datasetError) {
      console.error('Error retrieving dataset:', datasetError);
      throw new Error(`Could not retrieve dataset: ${datasetError.message}`);
    }
    
    // Try to get preview data directly first
    let previewData;
    try {
      // Try the edge function first
      const previewResponse = await supabase.functions.invoke('data-processor', {
        body: { 
          action: 'preview', 
          dataset_id: datasetId 
        }
      });
      
      if (previewResponse.error) {
        throw new Error(previewResponse.error.message || 'Error retrieving dataset preview');
      }
      
      previewData = previewResponse.data?.data;
    } catch (previewError) {
      console.warn('Edge function for preview failed, falling back to direct data access:', previewError);
      
      // Use direct data access method as fallback
      previewData = await dataService.previewDataset(datasetId);
      
      if (!previewData || !Array.isArray(previewData) || previewData.length === 0) {
        console.error('Could not retrieve preview data through any method');
        throw new Error('Failed to load dataset preview through any available method');
      }
      
      console.log(`Retrieved ${previewData.length} rows via direct data access fallback`);
    }

    // Try to call the AI query function with the dataset information and preview data
    try {
      const response = await supabase.functions.invoke('ai-query', {
        body: { 
          datasetId, 
          query,
          model,
          previewData
        }
      });
      
      if (response.error) {
        throw new Error(`AI analysis failed: ${response.error.message}`);
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
    } catch (aiQueryError) {
      console.warn('AI query edge function failed, falling back to local processing:', aiQueryError);
      
      // Use local processing as a last resort
      return processQueryLocally(query, previewData, model, dataset.name || 'Dataset');
    }
  } catch (error) {
    console.error('Error in NLP query:', error);
    throw error;
  }
};

// Local fallback function for when the edge function is unavailable
const processQueryLocally = async (
  query: string, 
  previewData: any[],
  model: 'openai' | 'anthropic',
  datasetName: string
): Promise<QueryResult> => {
  try {
    console.log('Processing query locally with', previewData.length, 'rows of data');
    
    if (!previewData || previewData.length === 0) {
      throw new Error('No data available for processing');
    }
    
    // Get the column names from the first row
    const columns = Object.keys(previewData[0]);
    
    // Find likely numeric columns for analysis
    const numericColumns = columns.filter(col => 
      typeof previewData[0][col] === 'number' || 
      !isNaN(parseFloat(previewData[0][col]))
    );
    
    // Find likely categorical columns
    const categoricalColumns = columns.filter(col => 
      typeof previewData[0][col] === 'string' && 
      !numericColumns.includes(col)
    );
    
    console.log('Detected columns:', {
      numeric: numericColumns,
      categorical: categoricalColumns
    });
    
    // Simple logic to determine chart type and axes based on the query
    let chartType = 'bar';
    let xAxis = categoricalColumns.length > 0 ? categoricalColumns[0] : columns[0];
    let yAxis = numericColumns.length > 0 ? numericColumns[0] : columns[1] || columns[0];
    
    // Look for chart type hints in the query
    if (/trend|over time|time series/i.test(query)) {
      chartType = 'line';
    } else if (/distribution|breakdown|percentage|ratio|proportion/i.test(query)) {
      chartType = 'pie';
      // For pie charts, we need a good categorical column
      if (categoricalColumns.length > 0) {
        xAxis = categoricalColumns[0];
      }
    } else if (/compare|comparison|bar/i.test(query)) {
      chartType = 'bar';
    }
    
    // Look for specific column mentions in the query
    columns.forEach(col => {
      const normalizedCol = col.toLowerCase().replace(/_/g, ' ');
      const normalizedQuery = query.toLowerCase();
      
      if (normalizedQuery.includes(normalizedCol)) {
        // If a column is mentioned and it's numeric, it's likely the y-axis
        if (numericColumns.includes(col)) {
          yAxis = col;
        } 
        // If a column is mentioned and it's categorical, it's likely the x-axis
        else if (categoricalColumns.includes(col)) {
          xAxis = col;
        }
      }
    });
    
    const modelName = model === 'anthropic' ? 'Claude 3.7 Sonnet' : 'GPT-4o';
    
    // Create a descriptive title and explanation
    const chartTitle = `${yAxis} by ${xAxis}`;
    const explanation = `Analysis of ${yAxis} by ${xAxis} from your dataset "${datasetName}" (processed locally with ${modelName} unavailable)`;
    
    console.log(`Local processing complete - Using ${chartType} chart with X: ${xAxis}, Y: ${yAxis}`);
    
    // Return the result in the expected format
    return {
      chartType,
      chart_type: chartType,
      xAxis,
      x_axis: xAxis,
      yAxis, 
      y_axis: yAxis,
      chart_title: chartTitle,
      explanation,
      data: previewData
    };
  } catch (error) {
    console.error('Error in local query processing:', error);
    throw new Error(`Failed to process query locally: ${error.message}`);
  }
};

// NLP service with additional helper functions
export const nlpService = {
  processQuery: async (query: string, datasetId: string, model: 'openai' | 'anthropic' = 'openai'): Promise<QueryResult> => {
    try {
      console.log(`Processing query using ${model} model: "${query}"`);
      // Process query through Edge function with fallback
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
