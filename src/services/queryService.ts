
import { supabase } from '@/lib/supabase';
import { QueryResult } from './types/queryTypes';

export interface QueryConfig {
  datasetId: string;
  chartType?: string;
  dimensions: string[];
  metrics: string[];
  filters?: FilterCondition[];
  limit?: number;
  measures?: Array<{field: string, aggregation: string}>;
  chart_type?: string; // For backward compatibility
}

export interface SavedQuery {
  name: string;
  dataset_id: string;
  query_type: string;
  query_text: string;
  query_config: any;
}

export interface FilterCondition {
  column: string;
  operator: string;
  value: string | number;
}

export const queryService = {
  executeQuery: async (config: QueryConfig): Promise<QueryResult> => {
    try {
      const response = await supabase.functions.invoke('transform', {
        body: { config },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Error executing query');
      }

      // Normalize the response to ensure property consistency
      const result = response.data as QueryResult;
      
      // Add property aliases for consistency
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
      console.error('Query execution error:', error);
      return {
        data: [],
        columns: [],
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      };
    }
  },

  saveQuery: async (query: SavedQuery): Promise<{ id: string }> => {
    try {
      const { data, error } = await supabase
        .from('saved_queries')
        .insert({
          name: query.name,
          config: query.query_config,
          query_type: query.query_type,
          query_text: query.query_text,
          dataset_id: query.dataset_id,
          user_id: (await supabase.auth.getUser()).data.user?.id,
        })
        .select('id')
        .single();

      if (error) throw error;
      return { id: data.id };
    } catch (error) {
      console.error('Error saving query:', error);
      throw error;
    }
  },
};

export type { QueryResult };
