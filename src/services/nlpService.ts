
import { supabase } from '@/lib/supabase';
import { QueryResult } from './types/queryTypes';

// Helper function to process AI query
export const processNLQuery = async (
  datasetId: string,
  query: string
): Promise<QueryResult> => {
  try {
    const response = await supabase.functions.invoke('ai-query', {
      body: { 
        datasetId, 
        query 
      }
    });
    
    if (response.error) {
      throw new Error(response.error.message);
    }
    
    return response.data as QueryResult;
  } catch (error) {
    console.error('Error in NLP query:', error);
    return {
      data: [],
      columns: [],
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
};

// Update exports to use the common QueryResult type
export type { QueryResult };
