import { supabase } from '@/lib/supabase';
import { toast as sonnerToast } from "sonner";
import { Dataset } from './types/datasetTypes';

export interface QueryResult {
  query: string;
  explanation?: string;
  chartType: string;
  xAxis?: string;
  yAxis?: string;
  data?: any;
  error?: string;
}

export const nlpService = {
  
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
