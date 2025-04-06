
import { supabase } from '@/lib/supabase';

export interface QueryResult {
  data: any[];
  columns: string[];
  error?: string;
  chartType: string;
  explanation?: string;
  chartConfig?: {
    title?: string;
    subtitle?: string;
    xAxis?: string;
    yAxis?: string;
    xAxisTitle?: string;
    yAxisTitle?: string;
  };
}

export const nlpService = {
  /**
   * Process a natural language query for a dataset
   */
  async processNaturalLanguageQuery(datasetId: string, query: string): Promise<QueryResult> {
    try {
      const { data: dataset, error: datasetError } = await supabase
        .from('datasets')
        .select('*')
        .eq('id', datasetId)
        .single();
        
      if (datasetError) throw new Error(`Failed to fetch dataset: ${datasetError.message}`);
      
      const { data, error } = await supabase.functions.invoke('ai-query', {
        body: {
          query,
          dataset_id: datasetId,
          dataset_name: dataset.name,
          column_schema: dataset.column_schema
        }
      });

      if (error) throw new Error(`Failed to process query: ${error.message}`);
      if (!data) throw new Error('No response received from AI query service');
      
      return {
        data: data.data || [],
        columns: data.columns || [],
        chartType: data.chart_type || 'bar',
        explanation: data.explanation,
        chartConfig: {
          title: data.chart_title,
          subtitle: data.chart_subtitle,
          xAxis: data.x_axis,
          yAxis: data.y_axis,
          xAxisTitle: data.x_axis_title,
          yAxisTitle: data.y_axis_title
        }
      };
    } catch (error) {
      console.error('Error in processNaturalLanguageQuery:', error);
      return {
        data: [],
        columns: [],
        error: String(error),
        chartType: 'bar',
        chartConfig: {}
      };
    }
  },
  
  /**
   * Process a query using the specified AI model
   */
  async processQuery(query: string, datasetId: string, model: 'openai' | 'anthropic' = 'openai'): Promise<QueryResult> {
    try {
      console.log(`Processing query using ${model} for dataset ${datasetId}`);
      
      const { data: dataset, error: datasetError } = await supabase
        .from('datasets')
        .select('*')
        .eq('id', datasetId)
        .single();
        
      if (datasetError) throw new Error(`Failed to fetch dataset: ${datasetError.message}`);
      
      const { data, error } = await supabase.functions.invoke('ai-query', {
        body: {
          query,
          dataset_id: datasetId,
          dataset_name: dataset.name,
          column_schema: dataset.column_schema,
          model: model
        }
      });
      
      if (error) throw new Error(`Failed to process query: ${error.message}`);
      if (!data) throw new Error('No response received from AI query service');
      
      return {
        data: data.data || [],
        columns: data.columns || [],
        chartType: data.chart_type || 'bar',
        explanation: data.explanation,
        chartConfig: {
          title: data.chart_title,
          subtitle: data.chart_subtitle,
          xAxis: data.x_axis,
          yAxis: data.y_axis,
          xAxisTitle: data.x_axis_title,
          yAxisTitle: data.y_axis_title
        }
      };
    } catch (error) {
      console.error('Error in processQuery:', error);
      return {
        data: [],
        columns: [],
        error: String(error),
        chartType: 'bar',
        chartConfig: {}
      };
    }
  },
  
  /**
   * Get dataset-specific query recommendations
   */
  getRecommendationsForDataset(dataset: any): string[] {
    if (!dataset || !dataset.column_schema) {
      return [
        "Tell me about this dataset",
        "Show me a summary",
        "Visualize the main trends",
        "What insights can you find?",
        "Compare the top values"
      ];
    }
    
    const columns = Object.keys(dataset.column_schema);
    const recommendations = [];
    
    // Check for common column types to generate relevant recommendations
    const hasCategorical = columns.some(col => 
      dataset.column_schema[col] === 'string' || 
      col.toLowerCase().includes('category') || 
      col.toLowerCase().includes('type')
    );
    
    const hasDate = columns.some(col => 
      dataset.column_schema[col] === 'date' || 
      col.toLowerCase().includes('date') || 
      col.toLowerCase().includes('time') || 
      col.toLowerCase().includes('year')
    );
    
    const hasNumeric = columns.some(col => 
      dataset.column_schema[col] === 'number' || 
      dataset.column_schema[col] === 'integer'
    );
    
    // Generate dataset-specific recommendations
    if (hasCategorical && hasNumeric) {
      const categoryCol = columns.find(col => 
        dataset.column_schema[col] === 'string' || 
        col.toLowerCase().includes('category') || 
        col.toLowerCase().includes('type')
      );
      recommendations.push(`Show distribution by ${categoryCol || 'category'}`);
      recommendations.push(`Compare values across different ${categoryCol || 'categories'}`);
    }
    
    if (hasDate && hasNumeric) {
      recommendations.push("Show trend over time");
      recommendations.push("Analyze monthly patterns");
    }
    
    if (hasNumeric) {
      const numericCols = columns.filter(col => 
        dataset.column_schema[col] === 'number' || 
        dataset.column_schema[col] === 'integer'
      );
      if (numericCols.length >= 2) {
        recommendations.push(`Find correlation between ${numericCols[0]} and ${numericCols[1]}`);
      }
      recommendations.push("Show me the highest and lowest values");
    }
    
    // Add some generic recommendations if we don't have enough specific ones
    if (recommendations.length < 5) {
      recommendations.push("Summarize this dataset");
      recommendations.push("What are the main insights?");
      recommendations.push("Create a visualization of key data points");
    }
    
    // Return up to 5 recommendations
    return recommendations.slice(0, 5);
  }
};
