
import { supabase } from '@/lib/supabase';
import { dataService } from './dataService';
import { toast } from "sonner";

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
      
      // If we're in a development environment or we can't connect to the edge function,
      // generate a mock response for testing purposes
      try {
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
      } catch (edgeFunctionError) {
        console.warn('Edge function error, using fallback processing:', edgeFunctionError);
        // Fallback to local processing for development or if edge function fails
        return this._generateFallbackResponse(query, dataset);
      }
    } catch (error) {
      console.error('Error processing NL query:', error);
      throw error;
    }
  },
  
  // Generate a fallback response when the edge function is not available
  _generateFallbackResponse(query: string, dataset: any): QueryResult {
    // Very basic logic to parse the query and determine what the user might want
    const queryLower = query.toLowerCase();
    let chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'table' = 'table';
    
    // Determine chart type based on query
    if (queryLower.includes('bar') || queryLower.includes('histogram')) {
      chartType = 'bar';
    } else if (queryLower.includes('line') || queryLower.includes('trend') || queryLower.includes('over time')) {
      chartType = 'line';
    } else if (queryLower.includes('pie') || queryLower.includes('proportion') || queryLower.includes('percentage')) {
      chartType = 'pie';
    } else if (queryLower.includes('scatter') || queryLower.includes('correlation')) {
      chartType = 'scatter';
    }
    
    // Generate simple dummy data for visualization
    const dummyData = this._generateDummyData(chartType);
    
    // Create a fallback response
    return {
      data: dummyData,
      chartType: chartType,
      chartConfig: {
        xAxisTitle: "Category",
        yAxisTitle: "Value",
        title: "Dataset Visualization (Fallback Mode)"
      },
      explanation: "This is a fallback visualization. For full AI-powered analysis, ensure the AI query edge function is operational."
    };
  },
  
  // Generate dummy data for fallback visualization
  _generateDummyData(chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'table'): any[] {
    const categories = ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'];
    
    switch (chartType) {
      case 'pie':
        return categories.map((cat, i) => ({
          name: cat,
          value: Math.round(Math.random() * 100)
        }));
        
      case 'scatter':
        return Array.from({ length: 20 }, (_, i) => ({
          x: Math.round(Math.random() * 100),
          y: Math.round(Math.random() * 100),
          name: `Point ${i+1}`
        }));
        
      case 'line':
        return Array.from({ length: 10 }, (_, i) => ({
          month: `Month ${i+1}`,
          value: Math.round(Math.random() * 100)
        }));
        
      case 'bar':
      case 'table':
      default:
        return categories.map((cat) => ({
          category: cat,
          value: Math.round(Math.random() * 100)
        }));
    }
  }
};
