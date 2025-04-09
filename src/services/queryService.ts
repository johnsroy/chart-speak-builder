import { supabase } from '@/lib/supabase';
import { QueryResult } from './types/queryTypes';
import { toast } from 'sonner';
import { parseCSV } from '@/services/utils/fileUtils';

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

export type { QueryResult };

export const queryService = {
  executeQuery: async (config: QueryConfig): Promise<QueryResult> => {
    try {
      console.log("Executing query with config:", config);
      
      // Try multiple approaches to get the full dataset
      let fullData: any[] | null = null;
      let dataLoadingMethod = '';
      
      // Approach 1: Use provided preview data if it's substantial
      if (config.dataPreview && Array.isArray(config.dataPreview) && config.dataPreview.length >= 100) {
        console.log(`Using provided preview data with ${config.dataPreview.length} rows`);
        fullData = config.dataPreview;
        dataLoadingMethod = 'preview';
      } 
      
      // Approach 2: Try to get dataset from session storage
      if (!fullData || fullData.length < 100) {
        try {
          console.log("Checking session storage for dataset cache");
          const sessionKey = `dataset_${config.datasetId}`;
          const cachedData = sessionStorage.getItem(sessionKey);
          
          if (cachedData) {
            const parsedCache = JSON.parse(cachedData);
            if (Array.isArray(parsedCache) && parsedCache.length > 0) {
              console.log(`Found ${parsedCache.length} rows in session storage cache`);
              fullData = parsedCache;
              dataLoadingMethod = 'cache';
            }
          }
        } catch (cacheErr) {
          console.error("Error accessing cache:", cacheErr);
        }
      }
      
      // Approach 3: Try to get data from dataset_data table
      if (!fullData || fullData.length < 100) {
        try {
          console.log("Attempting to get full dataset from dataset_data table");
          const { data: tableData, error } = await supabase
            .from('dataset_data')
            .select('*')
            .eq('dataset_id', config.datasetId)
            .limit(50000);
            
          if (!error && tableData && Array.isArray(tableData) && tableData.length > 0) {
            console.log(`Successfully loaded ${tableData.length} rows from dataset_data table`);
            fullData = tableData;
            dataLoadingMethod = 'database';
          } else if (error) {
            console.log("Error fetching from dataset_data table:", error.message);
          }
        } catch (err) {
          console.error("Exception when accessing dataset_data:", err);
        }
      }
      
      // Approach 4: Try to get data directly from storage
      if (!fullData || fullData.length < 100) {
        try {
          console.log("Attempting to load dataset from storage");
          
          // Get dataset info to find storage path
          const { data: dataset, error: datasetError } = await supabase
            .from('datasets')
            .select('*')
            .eq('id', config.datasetId)
            .single();
            
          if (datasetError) {
            console.error("Error getting dataset info:", datasetError);
          } else if (dataset && dataset.storage_path) {
            // Try to download the file from storage
            const { data: fileData, error: storageError } = await supabase
              .storage
              .from(dataset.storage_type || 'datasets')
              .download(dataset.storage_path);
              
            if (storageError) {
              console.error("Error downloading dataset file:", storageError);
            } else {
              // Parse CSV content
              const text = await fileData.text();
              const parsedData = await parseCSV(text, 50000); // Use our CSV parser utility
              
              console.log(`Successfully parsed ${parsedData.length} rows from storage file`);
              fullData = parsedData;
              dataLoadingMethod = 'storage';
              
              // Try to cache the data for future use
              try {
                sessionStorage.setItem(`dataset_${config.datasetId}`, JSON.stringify(parsedData.slice(0, 1000)));
                console.log("Dataset cached in session storage for future use");
              } catch (cacheErr) {
                console.warn("Could not cache dataset:", cacheErr);
              }
            }
          }
        } catch (storageErr) {
          console.error("Error loading from storage:", storageErr);
        }
      }
      
      // If we have the full dataset now, assign it to config.dataPreview and enable direct access
      if (fullData && fullData.length > 0) {
        config.dataPreview = fullData;
        config.useDirectAccess = true;
        
        // Try to cache the data for future use if not already done
        if (dataLoadingMethod !== 'cache') {
          try {
            const sessionKey = `dataset_${config.datasetId}`;
            sessionStorage.setItem(sessionKey, JSON.stringify(fullData.slice(0, 1000))); // Store up to 1000 rows
            console.log("Dataset cached in session storage for future use");
          } catch (cacheErr) {
            console.warn("Could not cache dataset:", cacheErr);
          }
        }
        
        console.log(`Using direct data access with ${fullData.length} rows (source: ${dataLoadingMethod})`);
        return processQueryLocally(config);
      }
      
      // If we still have no data, try using the edge function
      console.log("Unable to access full dataset directly, using edge function");
      try {
        const response = await supabase.functions.invoke('transform', {
          body: { config },
        });
  
        if (response.error) {
          console.log("Error from transform function:", response.error);
          throw new Error(response.error.message || 'Error executing query');
        }
  
        // Normalize the response to ensure property consistency
        const result = response.data as QueryResult;
        
        // If the result is empty or invalid, try to process locally if we have data
        if (!result || !result.data || result.data.length === 0) {
          throw new Error("Edge function returned empty results");
        }
        
        console.log("Query executed successfully via edge function:", result);
        
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
      } catch (edgeFunctionError) {
        console.error("Edge function error:", edgeFunctionError);
        
        // Try direct data access as fallback
        const dataset = await getDatasetDirectly(config.datasetId);
        if (dataset && dataset.length > 0) {
          config.dataPreview = dataset;
          config.useDirectAccess = true;
          console.log(`Using fallback direct data access with ${dataset.length} rows`);
          return processQueryLocally(config);
        }
        
        throw edgeFunctionError;
      }
    } catch (error) {
      console.error('Query execution error:', error);
      
      // Final fallback - try direct dataset access one more time
      try {
        const dataset = await getDatasetDirectly(config.datasetId);
        if (dataset && dataset.length > 0) {
          config.dataPreview = dataset;
          config.useDirectAccess = true;
          console.log(`Using error handler fallback with ${dataset.length} rows`);
          return processQueryLocally(config);
        }
      } catch (finalError) {
        console.error("Final fallback error:", finalError);
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
  
  /**
   * Load dataset directly without executing a query
   * @param datasetId The dataset ID to load
   * @returns Promise resolving to the dataset data or null if not found
   */
  loadDataset: async (datasetId: string): Promise<any[] | null> => {
    return getDatasetDirectly(datasetId);
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
 * Helper function to get dataset data directly from multiple sources
 */
async function getDatasetDirectly(datasetId: string): Promise<any[] | null> {
  console.log(`Loading complete dataset ${datasetId} directly`);
  
  // Try multiple approaches to get the full dataset
  let fullData: any[] | null = null;
  
  // First check session storage cache
  try {
    console.log("Checking session storage for dataset cache");
    const sessionKey = `dataset_${datasetId}`;
    const cachedData = sessionStorage.getItem(sessionKey);
    
    if (cachedData) {
      const parsedCache = JSON.parse(cachedData);
      if (Array.isArray(parsedCache) && parsedCache.length > 0) {
        console.log(`Found ${parsedCache.length} rows in session storage cache`);
        return parsedCache;
      }
    }
  } catch (cacheErr) {
    console.error("Error accessing cache:", cacheErr);
  }
  
  // Get dataset info to check preview_key
  let dataset: any = null;
  try {
    const { data, error } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', datasetId)
      .single();
      
    if (error) {
      console.error("Error getting dataset info:", error);
    } else {
      dataset = data;
      console.log("Dataset info:", dataset);
      
      // Check for preview key
      if (dataset.preview_key) {
        try {
          const previewData = sessionStorage.getItem(dataset.preview_key);
          if (previewData) {
            const parsed = JSON.parse(previewData);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log(`Found ${parsed.length} rows using preview_key: ${dataset.preview_key}`);
              
              // Cache this for future use under the dataset ID
              try {
                sessionStorage.setItem(`dataset_${datasetId}`, previewData);
              } catch (e) {
                console.warn("Could not cache dataset:", e);
              }
              
              return parsed;
            }
          }
        } catch (previewError) {
          console.warn("Preview key access error:", previewError);
        }
      }
    }
  } catch (datasetErr) {
    console.error("Error loading dataset metadata:", datasetErr);
  }
  
  // Try to get data from dataset_data table - increased row limit to 50,000
  try {
    console.log("Attempting to get complete dataset from dataset_data table");
    const { data: tableData, error } = await supabase
      .from('dataset_data')
      .select('*')
      .eq('dataset_id', datasetId)
      .limit(50000); // Increased limit to 50,000 rows
      
    if (!error && tableData && Array.isArray(tableData) && tableData.length > 0) {
      console.log(`Successfully loaded ${tableData.length} rows from dataset_data table`);
      fullData = tableData;
      
      // Cache the result for future use (up to 10,000 rows to prevent storage issues)
      try {
        sessionStorage.setItem(`dataset_${datasetId}`, JSON.stringify(tableData.slice(0, 10000)));
      } catch (e) {
        console.warn("Could not cache dataset in session storage", e);
      }
      
      return fullData;
    } else if (error) {
      console.log("Error fetching from dataset_data table:", error.message);
    }
  } catch (err) {
    console.error("Exception when accessing dataset_data:", err);
  }
  
  // Try to get data directly from storage if we have dataset info
  if (dataset && dataset.storage_path) {
    try {
      console.log(`Attempting to load complete dataset file from ${dataset.storage_type || 'datasets'}/${dataset.storage_path}`);
      
      // Try to download the file from storage
      const { data: fileData, error: storageError } = await supabase
        .storage
        .from(dataset.storage_type || 'datasets')
        .download(dataset.storage_path);
        
      if (storageError) {
        console.error("Error downloading dataset file:", storageError);
      } else if (fileData) {
        // Parse CSV content - increased limit to 50,000 rows
        const text = await fileData.text();
        const parsedData = await parseCSV(text, 50000); // Increased to 50,000 rows
        
        console.log(`Successfully parsed ${parsedData.length} rows from storage file`);
        
        // Cache the result for future use (up to 10,000 rows)
        try {
          sessionStorage.setItem(`dataset_${datasetId}`, JSON.stringify(parsedData.slice(0, 10000)));
        } catch (e) {
          console.warn("Could not cache dataset in session storage", e);
        }
        
        return parsedData;
      }
    } catch (storageErr) {
      console.error("Error loading from storage:", storageErr);
    }
  }
  
  console.log("Could not load dataset from any source");
  return null;
}

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
    if (chartType === 'bar' || chartType === 'pie' || chartType === 'column' || chartType === 'donut') {
      console.log(`Aggregating data for ${chartType} chart`);
      const groupedData = filteredData.reduce((acc, row) => {
        const key = String(row[xField]);
        if (!acc[key]) {
          acc[key] = { [xField]: key, [yField]: 0, count: 0 };
        }
        // Only add numeric values
        const numValue = Number(row[yField]);
        if (!isNaN(numValue)) {
          acc[key][yField] += numValue;
        }
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
    
    // Calculate statistics for the dataset
    const numValues = filteredData.map(item => Number(item[yField])).filter(val => !isNaN(val));
    const stats = {
      count: numValues.length,
      sum: numValues.reduce((sum, val) => sum + val, 0),
      avg: numValues.length > 0 ? numValues.reduce((sum, val) => sum + val, 0) / numValues.length : 0,
      min: numValues.length > 0 ? Math.min(...numValues) : 0,
      max: numValues.length > 0 ? Math.max(...numValues) : 0
    };
    
    console.log("Local processing complete with stats:", stats);
    return {
      data: filteredData,
      columns,
      chartType: chartType || 'bar',
      xAxis: xField,
      yAxis: yField,
      stats
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
