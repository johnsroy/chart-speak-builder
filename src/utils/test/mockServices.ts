
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
    console.log(`Processing file: ${file.name} (${file.type})`);
    // Handle different file types
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      const text = await file.text();
      const data = await parseCSV(text); // Make sure we await the result
      console.log(`Parsed CSV with ${data.length} rows:`, data.slice(0, 2));
      return data;
    }
    else if (file.type === 'application/json' || file.name.endsWith('.json')) {
      const text = await file.text();
      const data = JSON.parse(text);
      console.log(`Parsed JSON:`, Array.isArray(data) ? data.slice(0, 2) : data);
      return Array.isArray(data) ? data : [data];
    }
    else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      // For Excel files, return mock data for now
      // In a real implementation, you would use a library like xlsx to parse Excel files
      console.log('Excel file detected, using mock data (XLSX parser not implemented)');
      return chartData;
    }
    
    console.log('Unrecognized file type, using sample data');
    return chartData; // Fallback to sample data if file type is not supported
  } catch (error) {
    console.error('Error processing uploaded file:', error);
    return chartData;
  }
};

// Function to analyze actual data columns and determine suitable chart type
const analyzeDataStructure = (data: any[]): { 
  chartType: string; 
  xAxis: string; 
  yAxis: string;
  title: string;
  explanation: string;
} => {
  if (!data || data.length === 0) {
    return {
      chartType: 'bar',
      xAxis: 'category',
      yAxis: 'value',
      title: 'No Data Available',
      explanation: 'No data was found to analyze.'
    };
  }

  // Get column names from the first data item
  const columns = Object.keys(data[0]);
  
  // Analyze columns to find suitable x and y axes
  const categoricalColumns: string[] = [];
  const numericalColumns: string[] = [];
  const dateColumns: string[] = [];
  
  // Sample a few rows to determine column types
  const sampleSize = Math.min(data.length, 5);
  
  columns.forEach(column => {
    // Skip id columns
    if (column.toLowerCase() === 'id') return;
    
    // Check column values to determine type
    let isNumeric = true;
    let isDate = true;
    let hasString = false;
    
    for (let i = 0; i < sampleSize; i++) {
      const value = data[i][column];
      
      // Check if numeric
      if (isNumeric && (typeof value !== 'number' && isNaN(Number(value)))) {
        isNumeric = false;
      }
      
      // Check if potentially a date string
      if (isDate && typeof value === 'string') {
        if (isNaN(Date.parse(value))) {
          isDate = false;
        }
      } else {
        isDate = false;
      }
      
      // Check if contains string values
      if (typeof value === 'string' && !isDate) {
        hasString = true;
      }
    }
    
    if (isNumeric) {
      numericalColumns.push(column);
    } else if (isDate) {
      dateColumns.push(column);
    } else if (hasString) {
      categoricalColumns.push(column);
    } else {
      // Mixed or other types, consider as categorical
      categoricalColumns.push(column);
    }
  });
  
  console.log('Data analysis results:', {
    categorical: categoricalColumns,
    numerical: numericalColumns,
    date: dateColumns
  });
  
  // Determine best chart type and axes based on data structure
  let chartType = 'bar';
  let xAxis = categoricalColumns[0] || columns[0];
  let yAxis = numericalColumns[0] || columns[1] || columns[0];
  let title = '';
  let explanation = '';
  
  if (dateColumns.length > 0) {
    // We have date columns, good for time series
    chartType = 'line';
    xAxis = dateColumns[0];
    title = `${yAxis} Trends Over Time`;
    explanation = `This line chart shows how ${yAxis} changes over time, allowing you to identify trends and patterns.`;
  } else if (categoricalColumns.length > 0 && numericalColumns.length > 0) {
    // We have both categorical and numerical data
    chartType = 'bar';
    xAxis = categoricalColumns[0];
    yAxis = numericalColumns[0];
    title = `${yAxis} by ${xAxis}`;
    explanation = `This bar chart compares ${yAxis} across different ${xAxis} categories, helping you identify notable differences.`;
  } else if (numericalColumns.length > 1) {
    // Multiple numerical columns, could use scatter plot
    chartType = 'scatter';
    xAxis = numericalColumns[0];
    yAxis = numericalColumns[1];
    title = `${yAxis} vs ${xAxis}`;
    explanation = `This scatter plot shows the relationship between ${xAxis} and ${yAxis}, helping you identify correlations and patterns.`;
  }
  
  return {
    chartType,
    xAxis,
    yAxis,
    title,
    explanation
  };
};

// Mock function to test NLP query with actual or sample data
export const testNLPQuery = async (query: string, data?: any[]): Promise<any> => {
  console.log(`Running NLP query: "${query}" with ${data?.length || 0} data rows`);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // If we have actual data, use it instead of mock responses
  if (data && Array.isArray(data) && data.length > 0) {
    console.log(`Using uploaded data with ${data.length} rows for analysis`);
    
    // Get basic data analysis
    const dataAnalysis = analyzeDataStructure(data);
    
    // Adjust chart type based on the query keywords
    let chartType = dataAnalysis.chartType;
    
    // Override chart type based on query keywords
    if (query.toLowerCase().includes('pie') || query.toLowerCase().includes('distribution')) {
      chartType = 'pie';
    } else if (query.toLowerCase().includes('line') || query.toLowerCase().includes('trend') || 
               query.toLowerCase().includes('time') || query.toLowerCase().includes('over')) {
      chartType = 'line';
    } else if (query.toLowerCase().includes('bar') || query.toLowerCase().includes('compare')) {
      chartType = 'bar';
    } else if (query.toLowerCase().includes('scatter') || query.toLowerCase().includes('correlation')) {
      chartType = 'scatter';
    }
    
    // Try to find mentioned fields in the query
    const columnNames = Object.keys(data[0]);
    let bestXAxis = dataAnalysis.xAxis;
    let bestYAxis = dataAnalysis.yAxis;
    
    // Look for column names mentioned in the query
    columnNames.forEach(column => {
      if (query.toLowerCase().includes(column.toLowerCase())) {
        // If this is a categorical field and mentioned in query, use it as x-axis
        if (typeof data[0][column] === 'string') {
          bestXAxis = column;
        }
        // If this is a numerical field and mentioned in query, use it as y-axis
        else if (typeof data[0][column] === 'number') {
          bestYAxis = column;
        }
      }
    });
    
    // Generate an appropriate title based on the query
    let title = `${bestYAxis} by ${bestXAxis}`;
    if (query.toLowerCase().includes('show') || query.toLowerCase().includes('visualize')) {
      title = `Visualization of ${bestYAxis} by ${bestXAxis}`;
    }
    
    // Create response with actual data
    return {
      chart_type: chartType,
      x_axis: bestXAxis,
      y_axis: bestYAxis,
      chart_title: title,
      explanation: `This visualization shows the relationship between ${bestXAxis} and ${bestYAxis} based on your query: "${query}"`,
      data: data,
      columns: columnNames
    };
  }
  
  // If no data provided, fall back to mock responses
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
  
  console.log('Using mock response:', response.chart_type);
  return response;
};

// Mock function to test preset queries with actual or sample data
export const testDataQuery = async (queryType: string, data?: any[]): Promise<any> => {
  console.log(`Running preset query: ${queryType} with ${data?.length || 0} data rows`);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  // Get preset chart configuration
  const queryConfig = sampleQueries[queryType as keyof typeof sampleQueries]?.query_config || {
    type: 'bar',
    x: 'category',
    y: 'value',
    title: 'Data Visualization'
  };
  
  // If we have actual data, use it instead of sample data
  if (data && Array.isArray(data) && data.length > 0) {
    console.log(`Using uploaded data for ${queryType} visualization`);
    
    const columnNames = Object.keys(data[0]);
    
    // Based on the query type, determine appropriate axes
    let xAxis = '';
    let yAxis = '';
    let chartTitle = '';
    
    if (queryType === 'barChart') {
      // For bar chart, find a categorical column for x-axis and numerical for y-axis
      xAxis = columnNames.find(col => 
        typeof data[0][col] === 'string' && 
        col.toLowerCase() !== 'id'
      ) || columnNames[0];
      
      yAxis = columnNames.find(col => 
        typeof data[0][col] === 'number'
      ) || columnNames[1] || columnNames[0];
      
      chartTitle = `${yAxis} by ${xAxis}`;
    }
    else if (queryType === 'lineChart') {
      // For line chart, try to find date column for x-axis
      xAxis = columnNames.find(col => 
        typeof data[0][col] === 'string' && 
        (col.toLowerCase().includes('date') || 
         col.toLowerCase().includes('time') || 
         col.toLowerCase().includes('year') ||
         !isNaN(Date.parse(data[0][col])))
      ) || columnNames[0];
      
      yAxis = columnNames.find(col => 
        typeof data[0][col] === 'number'
      ) || columnNames[1] || columnNames[0];
      
      chartTitle = `${yAxis} Trends`;
    }
    else if (queryType === 'pieChart') {
      // For pie chart, find a categorical column and a numerical value
      xAxis = columnNames.find(col => 
        typeof data[0][col] === 'string' && 
        col.toLowerCase() !== 'id'
      ) || columnNames[0];
      
      yAxis = columnNames.find(col => 
        typeof data[0][col] === 'number'
      ) || columnNames[1] || columnNames[0];
      
      chartTitle = `${yAxis} Distribution by ${xAxis}`;
    }
    else {
      // Default behavior
      xAxis = columnNames[0];
      yAxis = columnNames[1] || columnNames[0];
      chartTitle = `${queryType} Visualization`;
    }
    
    // Handle numeric x-axis if needed
    const allValues = data.map(item => item[xAxis]);
    const isNumericXAxis = allValues.every(val => !isNaN(Number(val)));
    
    // For truly numeric x-axis values in a non-pie chart, consider using a line chart
    if (isNumericXAxis && queryType !== 'pieChart') {
      return {
        chart_type: 'line',
        x_axis: xAxis,
        y_axis: yAxis,
        chart_title: chartTitle,
        explanation: `Line chart showing the relationship between numeric ${xAxis} values and ${yAxis}.`,
        data: data,
        columns: columnNames
      };
    }
    
    return {
      chart_type: queryConfig.type,
      x_axis: xAxis,
      y_axis: yAxis,
      chart_title: chartTitle,
      explanation: `This ${queryConfig.type} chart shows the relationship between ${xAxis} and ${yAxis} from your uploaded data.`,
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
