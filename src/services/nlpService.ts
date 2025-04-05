
import { supabase } from '@/lib/supabase';
import { dataService } from './dataService';

export interface QueryResult {
  data: any[];
  chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'table';
  chartConfig: any;
  sql?: string;
  explanation?: string;
}

export const nlpService = {
  // Process a natural language query
  async processQuery(query: string, datasetId: string, modelType: 'openai' | 'anthropic' = 'openai'): Promise<QueryResult> {
    try {
      // Get dataset information
      const dataset = await dataService.getDataset(datasetId);
      if (!dataset) {
        throw new Error('Dataset not found');
      }
      
      // Call our Supabase Edge Function to process the query
      const { data, error } = await supabase.functions.invoke('ai-query', {
        body: {
          dataset_id: datasetId,
          query_text: query,
          model_type: modelType
        }
      });
      
      if (error) {
        console.error('Error from AI query function:', error);
        throw new Error(`AI query failed: ${error.message}`);
      }
      
      // If no error but also no data, handle gracefully
      if (!data) {
        console.error('Empty response from AI query function');
        throw new Error('No response from AI query function');
      }
      
      return data as QueryResult;
    } catch (error) {
      console.error('Error processing NL query:', error);
      throw error;
    }
  }
};
