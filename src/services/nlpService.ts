
// Create or update the nlpService.ts file
import { supabase } from '@/lib/supabase';
import { QueryResult } from './types/queryTypes';
import { toast } from 'sonner';

export const nlpService = {
  processQuery: async (query: string, datasetId: string, model: 'openai' | 'anthropic' = 'openai', previewData: any[] = []): Promise<QueryResult> => {
    try {
      console.log(`Processing query using ${model === 'openai' ? 'GPT-4o' : 'Claude 3.7 Sonnet'} model: "${query}"`);
      
      // Log the size of preview data
      console.log(`Using provided preview data with ${previewData.length} rows`);
      
      // Call the AI query function
      console.log(`Calling AI query function for dataset ${datasetId} with model ${model === 'openai' ? 'GPT-4o' : 'Claude 3.7 Sonnet'}`);
      
      // Prepare a slimmed down version of the data if it's too large
      let dataToSend = previewData;
      if (previewData.length > 1000) {
        console.log(`Dataset is large (${previewData.length} rows), sending a representative sample`);
        
        // Take a representative sample to avoid payload size issues
        const sampleSize = 1000;
        const step = Math.max(1, Math.floor(previewData.length / sampleSize));
        
        dataToSend = [];
        for (let i = 0; i < previewData.length; i += step) {
          if (dataToSend.length < sampleSize) {
            dataToSend.push(previewData[i]);
          } else {
            break;
          }
        }
        
        console.log(`Using ${dataToSend.length} rows as representative sample`);
      }
      
      // Call the AI query function
      const { data, error } = await supabase.functions.invoke('ai-query', {
        body: { 
          datasetId, 
          query,
          model,
          previewData: dataToSend,
          previewDataLength: previewData.length // Send original length for context
        }
      });
      
      if (error) {
        console.error('Error from AI query edge function:', error);
        throw new Error(`Failed to process query: ${error.message}`);
      }
      
      console.log("AI query response:", data);
      
      if (!data || !data.chartType || !data.data) {
        // Try to enrich with available preview data if response data is empty
        if (data && data.chartType && (!data.data || data.data.length === 0) && previewData.length > 0) {
          console.log("No data in response, enriching with available preview data");
          data.data = enrichWithPreviewData(data, previewData);
        } else {
          throw new Error('Invalid response from query processor');
        }
      }
      
      // Extract result properties
      const result: QueryResult = {
        chart_type: data.chart_type || data.chartType,
        chartType: data.chart_type || data.chartType,
        x_axis: data.x_axis || data.xAxis,
        y_axis: data.y_axis || data.yAxis,
        xAxis: data.x_axis || data.xAxis,
        yAxis: data.y_axis || data.yAxis,
        color_scheme: data.color_scheme || 'professional',
        chart_title: data.chart_title || 'Data Visualization',
        explanation: data.explanation || `Analysis of ${data.xAxis || data.x_axis} vs ${data.yAxis || data.y_axis}`,
        data: data.data || [],
        columns: data.columns || [],
        query_id: data.query_id,
        model_used: model === 'openai' ? 'GPT-4o' : 'Claude 3.7 Sonnet',
        stats: data.stats
      };
      
      console.log("Final processed AI result:", {
        chartType: result.chartType,
        xAxis: result.xAxis,
        yAxis: result.yAxis,
        dataLength: result.data?.length,
        explanation: result.explanation?.substring(0, 50) + '...'
      });
      
      return result;
    } catch (error) {
      console.error('Error processing natural language query:', error);
      toast.error('Error processing query', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  },
  
  getRecommendationsForDataset: (dataset: any): string[] => {
    if (!dataset) {
      return [
        "What are the main trends in this dataset?",
        "Show me the top categories",
        "Compare the highest and lowest values",
        "Create a visualization of the data distribution",
        "What insights can you find in this data?"
      ];
    }
    
    const recommendations: string[] = [];
    const columns = dataset.column_schema ? Object.keys(dataset.column_schema) : [];
    
    // Dataset-type specific recommendations
    if (dataset.file_name) {
      const fileName = dataset.file_name.toLowerCase();
      
      if (fileName.includes('sales') || fileName.includes('revenue')) {
        recommendations.push(
          "What are the sales trends over time?",
          "Which product category has the highest revenue?",
          "Compare sales performance across regions",
          "Show monthly revenue growth",
          "Which time periods had the lowest sales?"
        );
      } else if (fileName.includes('customer') || fileName.includes('user')) {
        recommendations.push(
          "What is the customer distribution by segment?",
          "Show customer acquisition over time",
          "Which customer segment has the highest lifetime value?",
          "Compare customer retention across regions",
          "What is the average customer age?"
        );
      } else if (fileName.includes('product') || fileName.includes('inventory')) {
        recommendations.push(
          "Which products have the highest inventory levels?",
          "Compare product performance by category",
          "Show products with low stock levels",
          "What is the distribution of product prices?",
          "Which products have the highest profit margins?"
        );
      } else if (fileName.includes('vehicle') || fileName.includes('car') || fileName.includes('auto')) {
        recommendations.push(
          "Compare vehicle types by manufacturer",
          "Which car models have the highest fuel efficiency?",
          "Show the distribution of electric vehicle ranges",
          "What is the relationship between vehicle price and year?",
          "Which manufacturers have the most electric vehicle models?"
        );
      }
    }
    
    // Generic column-based recommendations
    if (columns.length > 0) {
      const dateColumns = columns.filter(col => 
        col.toLowerCase().includes('date') || 
        col.toLowerCase().includes('time') || 
        col.toLowerCase().includes('year')
      );
      
      const categoryColumns = columns.filter(col => 
        col.toLowerCase().includes('category') || 
        col.toLowerCase().includes('type') || 
        col.toLowerCase().includes('segment') ||
        col.toLowerCase().includes('region') ||
        col.toLowerCase().includes('country')
      );
      
      const measureColumns = columns.filter(col => 
        col.toLowerCase().includes('amount') || 
        col.toLowerCase().includes('price') || 
        col.toLowerCase().includes('cost') ||
        col.toLowerCase().includes('revenue') ||
        col.toLowerCase().includes('sales') ||
        col.toLowerCase().includes('profit')
      );
      
      // Add time-based recommendations
      if (dateColumns.length > 0) {
        const dateCol = dateColumns[0];
        recommendations.push(
          `Show trends over time using ${dateCol}`,
          `What's the monthly pattern in the data?`,
          `Compare values across different time periods`
        );
      }
      
      // Add category-based recommendations
      if (categoryColumns.length > 0 && measureColumns.length > 0) {
        const catCol = categoryColumns[0];
        const measureCol = measureColumns[0];
        recommendations.push(
          `Compare ${measureCol} across different ${catCol} values`,
          `What is the distribution of ${measureCol} by ${catCol}?`,
          `Which ${catCol} has the highest ${measureCol}?`
        );
      }
    }
    
    // Ensure we have enough recommendations
    const defaultRecs = [
      "What are the main trends in this dataset?",
      "Show me a summary of the key metrics",
      "Create a visualization of the data distribution",
      "What patterns or outliers can you find?",
      "Compare the top 5 values in the dataset"
    ];
    
    while (recommendations.length < 5) {
      const defaultRec = defaultRecs[recommendations.length];
      if (defaultRec && !recommendations.includes(defaultRec)) {
        recommendations.push(defaultRec);
      } else {
        break;
      }
    }
    
    // Return unique recommendations
    return recommendations.filter((item, index, self) => 
      self.indexOf(item) === index
    ).slice(0, 5);
  },
  
  getPreviousQueries: async (datasetId: string): Promise<any[]> => {
    try {
      const { data, error } = await supabase
        .from('queries')
        .select('*')
        .eq('dataset_id', datasetId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error('Error fetching previous queries:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getPreviousQueries:', error);
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
        console.error('Error fetching query by ID:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error in getQueryById:', error);
      return null;
    }
  }
};

// Helper function to enrich a result with preview data when the AI response has missing data
function enrichWithPreviewData(result: any, previewData: any[]): any[] {
  if (!previewData.length) return [];
  
  const xAxis = result.xAxis || result.x_axis;
  const yAxis = result.yAxis || result.y_axis;
  
  if (!xAxis || !yAxis) return [];
  
  try {
    // Try to extract the needed data from preview data
    const firstItem = previewData[0];
    
    // Check if the columns exist in preview data
    if (!firstItem.hasOwnProperty(xAxis) || !firstItem.hasOwnProperty(yAxis)) {
      console.log("Required columns not found in preview data");
      return [];
    }
    
    // Group by xAxis and aggregate yAxis values
    const grouped: Record<string, number> = {};
    
    previewData.forEach(item => {
      const xValue = String(item[xAxis] || '');
      const yValue = Number(item[yAxis] || 0);
      
      if (xValue && !isNaN(yValue)) {
        if (!grouped[xValue]) {
          grouped[xValue] = 0;
        }
        grouped[xValue] += yValue;
      }
    });
    
    // Convert back to array format
    const enrichedData = Object.entries(grouped).map(([key, value]) => ({
      [xAxis]: key,
      [yAxis]: value
    }));
    
    console.log(`Enriched data with ${enrichedData.length} rows from preview data`);
    return enrichedData;
  } catch (error) {
    console.error("Error enriching data:", error);
    return [];
  }
}
