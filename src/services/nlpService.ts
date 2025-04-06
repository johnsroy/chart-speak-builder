
import { supabase } from '@/lib/supabase';

export interface QueryResult {
  data: any[];
  columns: string[];
  error?: string;
  chartType: string;
  explanation?: string;
  chartConfig: {
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
  }
};
