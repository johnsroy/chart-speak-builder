
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
        // Show loading toast for better UX
        const toastId = toast.loading(`Processing query with ${modelType === 'openai' ? 'OpenAI' : 'Claude'}...`);
        
        // Call our Supabase Edge Function to process the query
        const { data, error } = await supabase.functions.invoke('ai-query', {
          body: {
            dataset_id: datasetId,
            query_text: query,
            model_type: modelType
          }
        });
        
        // Always dismiss the loading toast
        toast.dismiss(toastId);
        
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
    let title = "Analysis Results";
    let explanation = "This is a fallback visualization generated locally.";
    
    // Determine chart type and generate appropriate title based on query
    if (queryLower.includes('bar') || queryLower.includes('histogram') || queryLower.includes('compare')) {
      chartType = 'bar';
      title = "Comparison Analysis";
      explanation = "This bar chart shows comparisons between different categories.";
    } else if (queryLower.includes('line') || queryLower.includes('trend') || queryLower.includes('over time')) {
      chartType = 'line';
      title = "Trend Analysis";
      explanation = "This line chart shows how values change over time.";
    } else if (queryLower.includes('pie') || queryLower.includes('proportion') || queryLower.includes('percentage') || queryLower.includes('distribution')) {
      chartType = 'pie';
      title = "Distribution Analysis";
      explanation = "This pie chart shows the proportional distribution across categories.";
    } else if (queryLower.includes('scatter') || queryLower.includes('correlation') || queryLower.includes('relationship')) {
      chartType = 'scatter';
      title = "Correlation Analysis";
      explanation = "This scatter plot shows the relationship between two variables.";
    }
    
    // Extract potential column names from the query
    const potentialColumns = Object.keys(dataset.column_schema || {}).filter(
      column => queryLower.includes(column.toLowerCase())
    );
    
    if (potentialColumns.length > 0) {
      title += `: ${potentialColumns.join(' vs ')}`;
    }
    
    // Generate smarter fallback data based on the chart type
    const dummyData = this._generateDummyData(chartType, potentialColumns, dataset.column_schema);
    
    return {
      data: dummyData,
      chartType: chartType,
      chartConfig: {
        xAxisTitle: potentialColumns[0] || "Category",
        yAxisTitle: potentialColumns[1] || "Value",
        title: title
      },
      explanation: explanation + " For full AI-powered analysis, ensure the AI query edge function is operational."
    };
  },
  
  // Generate smart dummy data for fallback visualization
  _generateDummyData(chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'table', columns: string[] = [], schema: Record<string, string> = {}): any[] {
    // Create appropriate sample data based on chart type
    switch (chartType) {
      case 'pie': {
        const categories = columns.length > 0 && schema[columns[0]] === 'string' 
          ? this._generateCategories(columns[0])
          : ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'];
        
        return categories.map((cat, i) => ({
          [columns.length > 0 ? columns[0] : 'category']: cat,
          [columns.length > 1 ? columns[1] : 'value']: Math.round(Math.random() * 100 + 20)
        }));
      }
      
      case 'scatter': {
        return Array.from({ length: 20 }, (_, i) => ({
          [columns.length > 0 ? columns[0] : 'x']: Math.round(Math.random() * 100),
          [columns.length > 1 ? columns[1] : 'y']: Math.round(Math.random() * 100),
          name: `Point ${i+1}`
        }));
      }
      
      case 'line': {
        const timeLabels = columns.length > 0 && schema[columns[0]] === 'date'
          ? this._generateDateSeries()
          : Array.from({ length: 10 }, (_, i) => `Month ${i+1}`);
          
        return timeLabels.map((label, i) => ({
          [columns.length > 0 ? columns[0] : 'time']: label,
          [columns.length > 1 ? columns[1] : 'value']: Math.round(
            50 + 30 * Math.sin(i / 3) + Math.random() * 15
          ) // Create a wave pattern with noise
        }));
      }
      
      case 'bar':
      case 'table':
      default: {
        const categories = columns.length > 0 && schema[columns[0]] === 'string'
          ? this._generateCategories(columns[0])
          : ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'];
          
        return categories.map((cat) => ({
          [columns.length > 0 ? columns[0] : 'category']: cat,
          [columns.length > 1 ? columns[1] : 'value']: Math.round(Math.random() * 100 + 10)
        }));
      }
    }
  },
  
  // Generate realistic categories based on column name
  _generateCategories(columnName: string): string[] {
    const lowerName = columnName.toLowerCase();
    
    if (lowerName.includes('region') || lowerName.includes('location') || lowerName.includes('country')) {
      return ['North America', 'Europe', 'Asia', 'Africa', 'South America'];
    }
    
    if (lowerName.includes('product') || lowerName.includes('item')) {
      return ['Electronics', 'Clothing', 'Home Goods', 'Sports', 'Books'];
    }
    
    if (lowerName.includes('month') || lowerName.includes('period')) {
      return ['January', 'February', 'March', 'April', 'May', 'June'];
    }
    
    if (lowerName.includes('category') || lowerName.includes('type') || lowerName.includes('segment')) {
      return ['Segment A', 'Segment B', 'Segment C', 'Segment D', 'Segment E'];
    }
    
    // Default categories
    return ['Group 1', 'Group 2', 'Group 3', 'Group 4', 'Group 5'];
  },
  
  // Generate a series of dates (last 6 months)
  _generateDateSeries(): string[] {
    const dates = [];
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today);
      date.setMonth(today.getMonth() - i);
      dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
  }
};
