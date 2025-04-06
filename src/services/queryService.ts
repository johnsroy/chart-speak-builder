
import { supabase } from '@/lib/supabase';
import { toast as sonnerToast } from "sonner";
import { Dataset } from './types/datasetTypes';

export interface QueryResult {
  query: string;
  explanation?: string;
  chartType: string;
  xAxis?: string;
  yAxis?: string;
  data?: any[];
  columns?: string[];
  error?: string;
}

export interface QueryConfig {
  dataset_id: string;
  chart_type: string;
  measures: Array<{
    field: string;
    aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count';
  }>;
  dimensions: Array<{
    field: string;
  }>;
  filters?: Array<{
    field: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'not_contains';
    value: any;
  }>;
  sort?: Array<{
    field: string;
    direction: 'asc' | 'desc';
  }>;
  limit?: number;
}

export interface SavedQuery {
  name: string;
  dataset_id: string;
  query_type: 'ui_builder' | 'natural_language' | 'sql';
  query_text: string;
  query_config: QueryConfig;
}

export const queryService = {
  
  executeQuery: async (query: SavedQuery): Promise<QueryResult> => {
    try {
      console.log(`Executing query: ${query.name} of type ${query.query_type}`);
      
      const { data, error } = await supabase.functions.invoke('transform', {
        body: {
          query_type: query.query_type,
          dataset_id: query.dataset_id,
          query_text: query.query_text,
          query_config: query.query_config
        },
      });
      
      if (error) {
        console.error("Error from transform function:", error);
        throw new Error(error.message);
      }
      
      if (!data) {
        throw new Error("No data returned from transform function");
      }
      
      console.log("Transform result:", data);
      return {
        query: query.query_text || query.name,
        chartType: query.query_config.chart_type,
        data: data.data,
        columns: data.columns,
        explanation: `Results for ${query.name}`
      };
    } catch (error) {
      console.error("Error executing query:", error);
      sonnerToast.error(`Failed to execute query: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        query: query.query_text || query.name,
        explanation: "Failed to get results from the query processor.",
        chartType: 'bar',
        data: [],
        columns: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  
  saveQuery: async (query: SavedQuery): Promise<void> => {
    try {
      const { error } = await supabase
        .from('queries')
        .insert({
          name: query.name,
          dataset_id: query.dataset_id,
          query_type: query.query_type,
          query_text: query.query_text,
          query_config: query.query_config,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });
      
      if (error) {
        throw new Error(`Failed to save query: ${error.message}`);
      }
      
      console.log("Query saved successfully");
    } catch (error) {
      console.error("Error saving query:", error);
      throw new Error(error instanceof Error ? error.message : 'Unknown error');
    }
  },
  
  getQueriesForDataset: async (datasetId: string): Promise<SavedQuery[]> => {
    try {
      const { data, error } = await supabase
        .from('queries')
        .select('*')
        .eq('dataset_id', datasetId)
        .order('created_at', { ascending: false });
        
      if (error) {
        throw new Error(`Failed to load queries: ${error.message}`);
      }
      
      return data as SavedQuery[];
    } catch (error) {
      console.error("Error loading queries:", error);
      throw new Error(error instanceof Error ? error.message : 'Unknown error');
    }
  },
  
  processQuery: async (query: string, datasetId: string, model: 'openai' | 'anthropic' = 'openai'): Promise<QueryResult> => {
    try {
      console.log(`Processing query: ${query} with model ${model}`);
      
      const { data, error } = await supabase.functions.invoke('data-analyzer', {
        body: { query: query, dataset_id: datasetId, model: model },
      });
      
      if (error) {
        console.error("Error from data-analyzer function:", error);
        throw new Error(error.message);
      }
      
      if (!data) {
        throw new Error("No data returned from data-analyzer function");
      }
      
      console.log("Data analyzer result:", data);
      return data as QueryResult;
    } catch (error) {
      console.error("Error processing query:", error);
      sonnerToast.error(`Failed to process query: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        query: query,
        explanation: "Failed to get results from the AI data analyzer.",
        chartType: 'bar',
        data: [],
        columns: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },
  
  getRecommendationsForDataset: (dataset: Dataset | null): string[] => {
    if (!dataset) {
      return [
        "Show me a summary of the main trends",
        "Create a breakdown by category",
        "Compare the top values in the dataset",
        "Show the distribution across categories", 
        "What patterns can you find in this data?"
      ];
    }
    
    const columnNames = Object.keys(dataset.column_schema);
    const numericColumns = columnNames.filter(key => dataset.column_schema[key] === 'number');
    const stringColumns = columnNames.filter(key => dataset.column_schema[key] === 'string');
    const booleanColumns = columnNames.filter(key => dataset.column_schema[key] === 'boolean');
    const dateColumns = columnNames.filter(key => dataset.column_schema[key] === 'date');
    
    const recommendations: string[] = [];
    
    if (numericColumns.length > 0) {
      recommendations.push(`What is the average ${numericColumns[0]}?`);
      recommendations.push(`Show me the distribution of ${numericColumns[0]}`);
      
      if (stringColumns.length > 0) {
        recommendations.push(`Show ${numericColumns[0]} by ${stringColumns[0]}`);
      }
    }
    
    if (stringColumns.length > 0) {
      recommendations.push(`What are the unique values in ${stringColumns[0]}?`);
      recommendations.push(`Count the occurrences of each ${stringColumns[0]}`);
    }
    
    if (dateColumns.length > 0 && numericColumns.length > 0) {
      recommendations.push(`Show ${numericColumns[0]} over time`);
    }
    
    if (booleanColumns.length > 0) {
      recommendations.push(`What is the count of true vs false in ${booleanColumns[0]}?`);
    }
    
    recommendations.push("Give me a summary of the dataset");
    
    return recommendations;
  }
};
