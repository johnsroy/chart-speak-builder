
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
  useDirectAccess?: boolean; // Flag to use direct data access without edge functions
  dataPreview?: any[]; // Data to use for direct processing
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

// Re-export QueryResult from types
export type { QueryResult };

export const queryService = {
  executeQuery: async (config: QueryConfig): Promise<QueryResult> => {
    try {
      console.log("Executing query with config:", config);
      
      // Check if we should use direct data access
      if ((config.useDirectAccess && config.dataPreview && Array.isArray(config.dataPreview)) || 
          (config.dataPreview && Array.isArray(config.dataPreview) && config.dataPreview.length > 0)) {
        console.log("Using direct data access for query execution with", config.dataPreview.length, "rows");
        return processQueryLocally(config);
      }
      
      // Otherwise use the edge function
      console.log("Using edge function for query execution");
      const response = await supabase.functions.invoke('transform', {
        body: { config },
      });

      if (response.error) {
        console.log("Error from transform function:", response.error);
        // If the transform function fails, try processing locally
        if (config.dataPreview && Array.isArray(config.dataPreview) && config.dataPreview.length > 0) {
          console.log("Falling back to local processing after edge function failure");
          return processQueryLocally(config);
        }
        throw new Error(response.error.message || 'Error executing query');
      }

      // Normalize the response to ensure property consistency
      const result = response.data as QueryResult;
      
      // If the result is empty or invalid, try to process locally if we have data
      if (!result || !result.data || result.data.length === 0) {
        if (config.dataPreview && Array.isArray(config.dataPreview) && config.dataPreview.length > 0) {
          console.log("Empty result from edge function, using local processing instead");
          return processQueryLocally(config);
        }
      }
      
      console.log("Query executed successfully:", result);
      
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
      
      // If we have dataPreview, try to process locally even on error
      if (config.dataPreview && Array.isArray(config.dataPreview) && config.dataPreview.length > 0) {
        console.log("Error occurred, using direct data processing as fallback");
        return processQueryLocally(config);
      }
      
      // Return a valid QueryResult object even on error
      return {
        data: [],
        columns: [],
        error: error instanceof Error ? error.message : 'Unknown query error',
        chartType: 'bar',
        xAxis: 'Category',
        yAxis: 'Value'
      };
    }
  },
  
  saveQuery: async (query: SavedQuery): Promise<{ id: string }> => {
    try {
      console.log("Saving query:", query);
      const { data, error } = await supabase.from('queries').insert([query]).select('id').single();
      
      if (error) {
        console.error("Error saving query:", error);
        throw new Error(error.message || 'Failed to save query');
      }
      
      console.log("Query saved successfully with ID:", data.id);
      return { id: data.id };
    } catch (error) {
      console.error('Error saving query:', error);
      throw new Error(error instanceof Error ? error.message : 'Unknown error saving query');
    }
  }
};

/**
 * Process a query locally using the provided data preview
 * This is a fallback for when edge functions aren't working
 * @param config QueryConfig with data preview
 * @returns ProcessedQueryResult
 */
function processQueryLocally(config: QueryConfig): QueryResult {
  try {
    console.log("Processing query locally with data:", config.dataPreview?.length || 0, "rows");
    const { dataPreview, dimensions, metrics, filters, limit, chartType } = config;
    
    if (!dataPreview || !Array.isArray(dataPreview) || dataPreview.length === 0) {
      console.error("No data available for local processing");
      throw new Error('No data available for processing');
    }
    
    // Extract dimension and metric fields
    const xField = dimensions && dimensions.length > 0 ? dimensions[0] : Object.keys(dataPreview[0])[0];
    const yField = metrics && metrics.length > 0 ? metrics[0] : Object.keys(dataPreview[0])[1];
    
    console.log(`Using fields for local processing - X: ${xField}, Y: ${yField}`);
    
    // Apply filters if provided
    let filteredData = dataPreview;
    if (filters && filters.length > 0) {
      console.log("Applying filters locally:", filters);
      filteredData = dataPreview.filter(row => {
        return filters.every(filter => {
          const { column, operator, value } = filter;
          const rowValue = row[column];
          
          switch (operator) {
            case '=': return rowValue === value;
            case '!=': return rowValue !== value;
            case '>': return rowValue > value;
            case '<': return rowValue < value;
            case '>=': return rowValue >= value;
            case '<=': return rowValue <= value;
            case 'LIKE': 
              return typeof rowValue === 'string' && 
                    typeof value === 'string' && 
                    rowValue.toLowerCase().includes(value.toLowerCase());
            default: return true;
          }
        });
      });
      console.log("After filtering:", filteredData.length, "rows remain");
    }
    
    // Apply limit if provided
    if (limit && limit > 0) {
      console.log(`Applying limit of ${limit} rows`);
      filteredData = filteredData.slice(0, limit);
    }
    
    // For aggregated charts like bar and pie, group by dimension
    // and aggregate the metric
    if (chartType === 'bar' || chartType === 'pie') {
      console.log(`Aggregating data for ${chartType} chart`);
      const groupedData = filteredData.reduce((acc, row) => {
        const key = String(row[xField]);
        if (!acc[key]) {
          acc[key] = { [xField]: key, [yField]: 0, count: 0 };
        }
        acc[key][yField] += Number(row[yField]) || 0;
        acc[key].count += 1;
        return acc;
      }, {} as Record<string, any>);
      
      filteredData = Object.values(groupedData);
      console.log("After aggregation:", filteredData.length, "data points");
    }
    
    // Extract column information - fixed to match expected types
    const columns = Object.keys(filteredData[0] || {})
      .filter(key => key !== 'count') // Remove helper fields
      .map(key => ({ name: key, type: typeof filteredData[0][key] }));
    
    console.log("Local processing complete");
    return {
      data: filteredData,
      columns,
      chartType: chartType || 'bar',
      xAxis: xField,
      yAxis: yField
    };
  } catch (error) {
    console.error('Local query processing error:', error);
    return {
      data: [],
      columns: [],
      error: error instanceof Error ? error.message : 'Error processing query locally',
      chartType: 'bar',
      xAxis: 'Category',
      yAxis: 'Value'
    };
  }
}
