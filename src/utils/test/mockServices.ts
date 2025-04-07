
import { supabase } from '@/lib/supabase';
import { QueryResult } from '@/services/types/queryTypes';
import { sampleQueries, chartData } from './sampleData';

// Store the original functions so we can restore them later
let originalFunctionInvoke: any = null;

// Setup mock functions
export const setupMockSupabaseFunctions = () => {
  // Save the original function
  if (!originalFunctionInvoke) {
    originalFunctionInvoke = supabase.functions.invoke;
  }
  
  // Mock the invoke function
  supabase.functions.invoke = async <T = any>(functionName: string, options: any = {}) => {
    console.log(`Mock invoking function: ${functionName}`, options);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Handle different function calls
    if (functionName === 'transform') {
      const { config } = options.body || {};
      const queryType = config?.chartType || config?.chart_type || 'bar';
      
      // Return appropriate mock data based on chart type
      switch (queryType) {
        case 'bar':
          return {
            data: {
              data: chartData.barChart,
              columns: ['category', 'value'],
              chart_type: 'bar',
              chartType: 'bar', // Add this for component compatibility
              x_axis: 'category',
              y_axis: 'value',
              chart_title: 'Sample Bar Chart'
            },
            error: null
          } as unknown as { data: T; error: null };
        case 'pie':
          return {
            data: {
              data: chartData.pieChart,
              columns: ['segment', 'value'],
              chart_type: 'pie',
              chartType: 'pie',
              chart_title: 'Sample Pie Chart'
            },
            error: null
          } as unknown as { data: T; error: null };
        case 'line':
          return {
            data: {
              data: chartData.lineChart,
              columns: ['date', 'value'],
              chart_type: 'line',
              chartType: 'line',
              x_axis: 'date',
              y_axis: 'value',
              chart_title: 'Sample Line Chart'
            },
            error: null
          } as unknown as { data: T; error: null };
        default:
          return {
            data: {
              data: [],
              columns: []
            },
            error: 'Unsupported chart type'
          } as unknown as { data: T; error: string };
      }
    }
    
    if (functionName === 'ai-query') {
      const { query } = options.body || {};
      
      return {
        data: {
          data: chartData.barChart,
          columns: ['product_category', 'sales'],
          chart_type: 'bar',
          chartType: 'bar',
          x_axis: 'product_category',
          y_axis: 'sales',
          chart_title: 'Sales by Product Category',
          explanation: `I analyzed your query "${query}" and determined that a bar chart showing sales by product category would best represent this data.`
        },
        error: null
      } as unknown as { data: T; error: null };
    }
    
    // Default fallback
    return {
      data: null,
      error: {
        message: `Mock function ${functionName} not implemented`
      }
    } as unknown as { data: T; error: { message: string } };
  };
};

// Restore original functions
export const restoreMockSupabaseFunctions = () => {
  if (originalFunctionInvoke) {
    supabase.functions.invoke = originalFunctionInvoke;
  }
};

// Test data query function
export const testDataQuery = async (queryType: string): Promise<QueryResult> => {
  try {
    // Convert queryType to correct config format
    let config;
    switch (queryType) {
      case 'barChart':
        config = sampleQueries.barChart.query_config;
        break;
      case 'pieChart':
        config = sampleQueries.pieChart.query_config;
        break;
      case 'lineChart':
        config = sampleQueries.lineChart.query_config;
        break;
      default:
        throw new Error(`Invalid query type: ${queryType}`);
    }
    
    // Call the transform function
    const result = await supabase.functions.invoke('transform', {
      body: { config }
    });
    
    if (result.error) {
      throw new Error(result.error.message || 'Query execution failed');
    }
    
    return result.data as QueryResult;
  } catch (error) {
    console.error(`Error executing ${queryType} query:`, error);
    return {
      data: [],
      columns: [],
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
};

// Test NLP query function
export const testNLPQuery = async (query: string): Promise<QueryResult> => {
  try {
    // Call the AI query function
    const result = await supabase.functions.invoke('ai-query', {
      body: { 
        datasetId: 'mock-dataset', 
        query 
      }
    });
    
    if (result.error) {
      throw new Error(result.error.message || 'NLP query execution failed');
    }
    
    return result.data as QueryResult;
  } catch (error) {
    console.error('Error executing NLP query:', error);
    return {
      data: [],
      columns: [],
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
};
