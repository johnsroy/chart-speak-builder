
import { supabase } from '@/lib/supabase';
import { nlpResponses, chartData, sampleQueries } from './sampleData';
import { parseCSV } from '@/services/utils/fileUtils';

// Store original Supabase functions to restore them later
let originalSupabaseFunctions: any = {};

// Mock Supabase client for testing
export const mockSupabaseClient = {
  storage: {
    from: () => ({
      upload: async () => ({ data: { path: 'test-path' }, error: null }),
      download: async () => ({ data: new Blob(['test data']), error: null }),
    }),
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: { storage_path: 'test-path' }, error: null }),
      }),
      order: () => ({ data: [], error: null }),
    }),
    insert: async () => ({ data: { id: 'test-id' }, error: null }),
  }),
};

// Setup mock Supabase functions for testing
export const setupMockSupabaseFunctions = () => {
  // Save original functions
  originalSupabaseFunctions = {
    storage: { ...supabase.storage },
    from: supabase.from,
    // Add other functions as needed
  };

  // Override with mock implementations for testing
  // (commented out to avoid interfering with actual Supabase calls)
  /*
  supabase.storage = mockSupabaseClient.storage;
  supabase.from = mockSupabaseClient.from;
  */
};

// Restore original Supabase functions
export const restoreMockSupabaseFunctions = () => {
  if (Object.keys(originalSupabaseFunctions).length > 0) {
    // Restore original functions
    // (commented out to avoid interfering with actual Supabase calls)
    /*
    supabase.storage = originalSupabaseFunctions.storage;
    supabase.from = originalSupabaseFunctions.from;
    */
  }
};

// Process a file upload and parse its contents
export const processUploadedFile = async (file: File): Promise<any[]> => {
  try {
    // Handle different file types
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      const text = await file.text();
      return parseCSV(text);
    }
    else if (file.type === 'application/json' || file.name.endsWith('.json')) {
      const text = await file.text();
      return JSON.parse(text);
    }
    else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // For Excel files, return mock data for now
      // In a real implementation, you would use a library like xlsx to parse Excel files
      return chartData;
    }
    
    return chartData; // Fallback to sample data if file type is not supported
  } catch (error) {
    console.error('Error processing uploaded file:', error);
    return chartData;
  }
};

// Mock function to test NLP query with actual or sample data
export const testNLPQuery = async (query: string, data?: any[]): Promise<any> => {
  console.log(`Running NLP query: ${query}`);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Determine which response to return based on query keywords
  let response: any;
  
  if (query.toLowerCase().includes('sales')) {
    response = nlpResponses.sales;
  } else if (query.toLowerCase().includes('product')) {
    response = nlpResponses.products;
  } else if (query.toLowerCase().includes('region')) {
    response = nlpResponses.regions;
  } else if (query.toLowerCase().includes('trend') || query.toLowerCase().includes('time') || query.toLowerCase().includes('growth')) {
    response = nlpResponses.timeSeries;
  } else {
    response = nlpResponses.default;
  }
  
  // If we have actual data, replace the mock data with it
  if (data && Array.isArray(data) && data.length > 0) {
    const columnNames = Object.keys(data[0]);
    
    // Use the actual data columns to determine appropriate chart_type and axes
    const hasTimeColumn = columnNames.some(col => 
      col.toLowerCase().includes('date') || 
      col.toLowerCase().includes('month') || 
      col.toLowerCase().includes('year') ||
      col.toLowerCase().includes('time')
    );
    
    const numericalColumns = columnNames.filter(col => {
      // Check a few rows to see if column contains numerical values
      return data.slice(0, 5).some(row => typeof row[col] === 'number');
    });
    
    const categoricalColumns = columnNames.filter(col => 
      !numericalColumns.includes(col) && col.toLowerCase() !== 'id'
    );
    
    // Determine chart type based on data
    let chartType = 'bar';
    let xAxis = categoricalColumns[0] || columnNames[0];
    let yAxis = numericalColumns[0] || columnNames[1] || columnNames[0];
    
    if (hasTimeColumn) {
      chartType = 'line';
      xAxis = columnNames.find(col => 
        col.toLowerCase().includes('date') || 
        col.toLowerCase().includes('month') || 
        col.toLowerCase().includes('year') ||
        col.toLowerCase().includes('time')
      ) || xAxis;
    } 
    else if (categoricalColumns.length > 0 && numericalColumns.length > 0) {
      if (query.toLowerCase().includes('pie') || query.toLowerCase().includes('distribution')) {
        chartType = 'pie';
      } else {
        chartType = 'bar';
      }
    }
    
    // Create response with actual data
    response = {
      chart_type: chartType,
      x_axis: xAxis,
      y_axis: yAxis,
      chart_title: `Analysis of ${yAxis} by ${xAxis}`,
      explanation: `This visualization shows the relationship between ${xAxis} and ${yAxis} from your uploaded data.`,
      data: data,
      columns: columnNames
    };
  }
  
  return response;
};

// Mock function to test preset queries with actual or sample data
export const testDataQuery = async (queryType: string, data?: any[]): Promise<any> => {
  console.log(`Running preset query: ${queryType}`);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const queryConfig = sampleQueries[queryType as keyof typeof sampleQueries]?.query_config || {
    type: 'bar',
    x: 'category',
    y: 'value',
    title: 'Data Visualization'
  };
  
  // If we have actual data, use it instead of sample data
  if (data && Array.isArray(data) && data.length > 0) {
    const columnNames = Object.keys(data[0]);
    
    // Choose appropriate columns based on query type and available data
    let xAxis = queryConfig.x;
    let yAxis = queryConfig.y;
    
    // If exact columns don't exist, try to find suitable replacements
    if (!columnNames.includes(xAxis)) {
      if (queryType === 'barChart' || queryType === 'pieChart') {
        xAxis = columnNames.find(col => 
          typeof data[0][col] === 'string' || 
          col.toLowerCase().includes('category') || 
          col.toLowerCase().includes('name') || 
          col.toLowerCase().includes('region')
        ) || columnNames[0];
      } 
      else if (queryType === 'lineChart') {
        xAxis = columnNames.find(col => 
          col.toLowerCase().includes('date') || 
          col.toLowerCase().includes('month') || 
          col.toLowerCase().includes('year') || 
          col.toLowerCase().includes('time')
        ) || columnNames[0];
      }
    }
    
    if (!columnNames.includes(yAxis)) {
      yAxis = columnNames.find(col => 
        typeof data[0][col] === 'number' || 
        col.toLowerCase().includes('value') || 
        col.toLowerCase().includes('sales') || 
        col.toLowerCase().includes('count')
      ) || columnNames[1] || columnNames[0];
    }
    
    return {
      chart_type: queryConfig.type,
      x_axis: xAxis,
      y_axis: yAxis,
      chart_title: queryConfig.title || `${yAxis} by ${xAxis}`,
      explanation: `This is a ${queryConfig.type} chart showing the relationship between ${xAxis} and ${yAxis} from your uploaded data.`,
      data: data,
      columns: columnNames
    };
  } 
  
  // Fallback to sample data response
  return {
    chart_type: queryConfig.type,
    x_axis: queryConfig.x,
    y_axis: queryConfig.y,
    chart_title: queryConfig.title,
    explanation: `This is a sample ${queryConfig.type} chart visualization.`,
    data: chartData,
    columns: Object.keys(chartData[0])
  };
};
