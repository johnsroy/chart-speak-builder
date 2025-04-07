
import { supabase } from '@/lib/supabase';
import { QueryResult } from './types/queryTypes';

export interface QueryConfig {
  datasetId: string;
  dimensions: string[];
  metrics: string[];
  filters?: FilterCondition[];
  chartType?: string;
  limit?: number;
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

      return response.data as QueryResult;
    } catch (error) {
      console.error('Query execution error:', error);
      return {
        data: [],
        columns: [],
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      };
    }
  },

  saveQuery: async (name: string, config: QueryConfig): Promise<{ id: string }> => {
    try {
      const { data, error } = await supabase
        .from('saved_queries')
        .insert({
          name,
          config,
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
