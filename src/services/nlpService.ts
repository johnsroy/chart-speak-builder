
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
      
      if (previewData.length === 0) {
        console.warn('No preview data provided, attempting to load from dataset');
        try {
          // Try to get dataset info to find more data
          const { data: dataset } = await supabase
            .from('datasets')
            .select('*')
            .eq('id', datasetId)
            .single();
            
          if (dataset) {
            console.log('Found dataset:', dataset.name);
            
            // Try to get data from preview key if available
            if (dataset.preview_key) {
              const cachedData = sessionStorage.getItem(dataset.preview_key);
              if (cachedData) {
                const parsed = JSON.parse(cachedData);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  console.log(`Found ${parsed.length} rows from preview key`);
                  previewData = parsed;
                }
              }
            }
            
            // If still no data, generate sample data based on the dataset schema
            if (previewData.length === 0 && dataset.column_schema) {
              console.log('Generating sample data from schema');
              const sampleData = generateSampleData(dataset);
              previewData = sampleData;
            }
          }
        } catch (error) {
          console.error('Error trying to load more data:', error);
        }
      }
      
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
      
      // If we're processing EV data based on the file name
      if (dataToSend.length > 0 && isElectricVehicleData(dataToSend)) {
        console.log("Processing electric vehicle data with specialized handling");
        return processElectricVehicleData(query, dataToSend);
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
        
        // Fall back to local processing if the edge function fails
        console.log('Edge function failed, falling back to local processing');
        if (previewData.length > 0) {
          return processLocalQuery(query, previewData);
        }
        
        throw new Error(`Failed to process query: ${error.message}`);
      }
      
      console.log("AI query response:", data);
      
      if (!data || !data.chartType || !data.data || data.data.length === 0) {
        // Try to enrich with available preview data if response data is empty
        if (data && previewData.length > 0) {
          console.log("No data in response, using local processing");
          return processLocalQuery(query, previewData);
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
      
      if (fileName.includes('vehicle') || fileName.includes('car') || fileName.includes('ev')) {
        recommendations.push(
          "What is the distribution of electric vehicle types?",
          "Compare electric ranges across different makes",
          "Show the top 10 vehicle models by count",
          "Is there a trend in EV adoption over time?",
          "What is the average range of electric vehicles?"
        );
      } else if (fileName.includes('sales') || fileName.includes('revenue')) {
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
      } else {
        recommendations.push(
          "Which categories have the highest values?",
          "Compare top vs. bottom performers",
          "Show the distribution of values",
          "Analyze trends over time if time data exists",
          "What correlations exist between different metrics?"
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

// Helper function to generate sample data from schema
function generateSampleData(dataset: any): any[] {
  const schema = dataset.column_schema || {};
  const result = [];
  
  // Create 100 sample data points
  for (let i = 0; i < 100; i++) {
    const row: any = {};
    
    for (const [key, type] of Object.entries(schema)) {
      if (type === 'number') {
        row[key] = Math.floor(Math.random() * 1000);
      } else if (type === 'boolean') {
        row[key] = Math.random() > 0.5;
      } else if (type === 'date') {
        const date = new Date();
        date.setDate(date.getDate() - Math.floor(Math.random() * 365));
        row[key] = date.toISOString().split('T')[0];
      } else {
        row[key] = `Sample ${key} ${i+1}`;
      }
    }
    
    result.push(row);
  }
  
  return result;
}

// Helper function to check if data is electric vehicle data
function isElectricVehicleData(data: any[]): boolean {
  if (data.length === 0) return false;
  
  const firstRow = data[0];
  const keys = Object.keys(firstRow);
  
  // Look for EV-related column names
  const evIndicators = ['make', 'model', 'vehicle', 'battery', 'range', 'bev', 'phev', 'electric'];
  
  for (const key of keys) {
    const lowerKey = key.toLowerCase();
    if (evIndicators.some(indicator => lowerKey.includes(indicator))) {
      return true;
    }
  }
  
  return false;
}

// Process electric vehicle data locally
function processElectricVehicleData(query: string, data: any[]): QueryResult {
  console.log("Processing electric vehicle data locally");
  
  let chartType: string = 'bar';
  let xAxis: string = '';
  let yAxis: string = '';
  let processedData: any[] = [];
  let explanation: string = '';
  
  const lowerQuery = query.toLowerCase();
  
  // Determine what kind of query we have
  if (lowerQuery.includes('distribution') || lowerQuery.includes('types') || lowerQuery.includes('categories')) {
    // Look for relevant columns
    const columns = Object.keys(data[0]);
    const typeColumn = columns.find(c => 
      c.toLowerCase().includes('type') || 
      c.toLowerCase().includes('category') ||
      c.toLowerCase().includes('make') ||
      c.toLowerCase().includes('model')
    ) || columns[0];
    
    xAxis = typeColumn;
    yAxis = 'count';
    
    // Group by the chosen column
    const grouped: Record<string, number> = {};
    data.forEach(row => {
      const key = String(row[typeColumn] || 'Unknown');
      grouped[key] = (grouped[key] || 0) + 1;
    });
    
    // Convert to array
    processedData = Object.entries(grouped)
      .map(([key, value]) => ({ [typeColumn]: key, count: value }))
      .sort((a, b) => b.count - a.count);
    
    // Limit to top results if there are many
    if (processedData.length > 15) {
      processedData = processedData.slice(0, 15);
    }
    
    explanation = `Distribution of electric vehicles by ${typeColumn}. This chart shows the count of different ${typeColumn} values in the dataset.`;
  } 
  else if (lowerQuery.includes('range') || lowerQuery.includes('battery')) {
    // Look for range column
    const columns = Object.keys(data[0]);
    const rangeColumn = columns.find(c => c.toLowerCase().includes('range')) || columns[0];
    const makeColumn = columns.find(c => c.toLowerCase().includes('make')) || columns[0];
    
    xAxis = makeColumn;
    yAxis = rangeColumn;
    
    // Group by make and average the range
    const grouped: Record<string, {total: number, count: number}> = {};
    data.forEach(row => {
      if (row[rangeColumn] && !isNaN(Number(row[rangeColumn]))) {
        const key = String(row[makeColumn] || 'Unknown');
        if (!grouped[key]) grouped[key] = {total: 0, count: 0};
        grouped[key].total += Number(row[rangeColumn]);
        grouped[key].count++;
      }
    });
    
    // Convert to array with averages
    processedData = Object.entries(grouped)
      .map(([key, {total, count}]) => ({ 
        [makeColumn]: key, 
        [rangeColumn]: Math.round(total / count)
      }))
      .filter(item => !isNaN(item[rangeColumn]))
      .sort((a, b) => b[rangeColumn] - a[rangeColumn]);
    
    explanation = `Comparison of average ${rangeColumn} by ${makeColumn}. This chart shows which makes of electric vehicles have the highest average range.`;
  }
  else if (lowerQuery.includes('top') || lowerQuery.includes('highest') || lowerQuery.includes('best')) {
    // Look for columns to compare
    const columns = Object.keys(data[0]);
    const modelColumn = columns.find(c => c.toLowerCase().includes('model')) || columns[0];
    const countKey = 'count';
    
    xAxis = modelColumn;
    yAxis = countKey;
    
    // Group by model
    const grouped: Record<string, number> = {};
    data.forEach(row => {
      const key = String(row[modelColumn] || 'Unknown');
      grouped[key] = (grouped[key] || 0) + 1;
    });
    
    // Convert to array
    processedData = Object.entries(grouped)
      .map(([key, value]) => ({ [modelColumn]: key, [countKey]: value }))
      .sort((a, b) => b[countKey] - a[countKey])
      .slice(0, 10);
    
    explanation = `Top 10 ${modelColumn} by count. This chart shows which models are most common in the dataset.`;
  }
  else if (lowerQuery.includes('trend') || lowerQuery.includes('time') || lowerQuery.includes('year')) {
    // Look for date/year column
    const columns = Object.keys(data[0]);
    const yearColumn = columns.find(c => 
      c.toLowerCase().includes('year') || 
      c.toLowerCase().includes('date') ||
      c.toLowerCase().includes('time')
    );
    
    if (yearColumn) {
      xAxis = yearColumn;
      yAxis = 'count';
      chartType = 'line';
      
      // Group by year
      const grouped: Record<string, number> = {};
      data.forEach(row => {
        const key = String(row[yearColumn] || 'Unknown');
        grouped[key] = (grouped[key] || 0) + 1;
      });
      
      // Convert to array
      processedData = Object.entries(grouped)
        .map(([key, value]) => ({ [yearColumn]: key, count: value }))
        .sort((a, b) => String(a[yearColumn]).localeCompare(String(b[yearColumn])));
      
      explanation = `Trend of electric vehicles over time by ${yearColumn}. This chart shows how the number of vehicles has changed over time.`;
    } else {
      // Fallback if no time column found
      const makeColumn = columns.find(c => c.toLowerCase().includes('make')) || columns[0];
      xAxis = makeColumn;
      yAxis = 'count';
      
      // Group by make
      const grouped: Record<string, number> = {};
      data.forEach(row => {
        const key = String(row[makeColumn] || 'Unknown');
        grouped[key] = (grouped[key] || 0) + 1;
      });
      
      // Convert to array
      processedData = Object.entries(grouped)
        .map(([key, value]) => ({ [makeColumn]: key, count: value }))
        .sort((a, b) => b.count - a.count);
      
      explanation = `Distribution of electric vehicles by ${makeColumn}. This chart shows the count of vehicles from different manufacturers.`;
    }
  }
  else {
    // Default to a simple distribution
    const columns = Object.keys(data[0]);
    const makeColumn = columns.find(c => c.toLowerCase().includes('make')) || columns[0];
    
    xAxis = makeColumn;
    yAxis = 'count';
    
    // Group by make
    const grouped: Record<string, number> = {};
    data.forEach(row => {
      const key = String(row[makeColumn] || 'Unknown');
      grouped[key] = (grouped[key] || 0) + 1;
    });
    
    // Convert to array
    processedData = Object.entries(grouped)
      .map(([key, value]) => ({ [makeColumn]: key, count: value }))
      .sort((a, b) => b.count - a.count);
    
    explanation = `Distribution of electric vehicles by ${makeColumn}. This visualization was created in response to: "${query}"`;
  }
  
  // Ensure we don't return empty data
  if (processedData.length === 0) {
    processedData = [{category: 'Sample', value: 100}];
    xAxis = 'category';
    yAxis = 'value';
    explanation = `No suitable data could be extracted for the query: "${query}". Showing sample visualization instead.`;
  }
  
  return {
    chartType: chartType,
    chart_type: chartType,
    xAxis: xAxis,
    x_axis: xAxis,
    yAxis: yAxis,
    y_axis: yAxis,
    data: processedData,
    explanation: explanation,
    chart_title: explanation.split('.')[0],
    columns: Object.keys(processedData[0]),
    color_scheme: 'professional',
  };
}

// Process a query locally as fallback
function processLocalQuery(query: string, data: any[]): QueryResult {
  console.log("Processing query locally:", query);
  
  // Simple analysis to determine what the user might be looking for
  const lowerQuery = query.toLowerCase();
  
  // Default chart configuration
  let chartType = 'bar';
  let xColumn = '';
  let yColumn = '';
  let processedData = [];
  let explanation = '';
  
  // Get column names from the first row
  const columns = Object.keys(data[0]);
  
  // Try to identify what columns to use based on the query
  if (lowerQuery.includes('trend') || lowerQuery.includes('over time') || lowerQuery.includes('across time')) {
    chartType = 'line';
    
    // Look for date/time columns
    const dateColumn = columns.find(column => 
      column.toLowerCase().includes('date') || 
      column.toLowerCase().includes('time') || 
      column.toLowerCase().includes('year') ||
      column.toLowerCase().includes('month')
    );
    
    // Look for numeric columns for the y-axis
    const numericColumn = findBestNumericColumn(data, columns);
    
    if (dateColumn && numericColumn) {
      xColumn = dateColumn;
      yColumn = numericColumn;
      
      // Group by date and sum/average the numeric column
      const groupedData = groupByColumn(data, dateColumn, numericColumn);
      processedData = convertGroupedData(groupedData, dateColumn, numericColumn);
      
      explanation = `Showing ${numericColumn} trend over time (${dateColumn}). This visualization demonstrates how ${numericColumn} has changed across different time periods.`;
    }
  }
  
  // If no valid columns found or not a trend query, fall back to category comparison
  if (!xColumn || !yColumn) {
    // Look for potential category column
    const categoryColumn = findBestCategoryColumn(data, columns);
    const numericColumn = findBestNumericColumn(data, columns);
    
    if (categoryColumn && numericColumn) {
      xColumn = categoryColumn;
      yColumn = numericColumn;
      
      // Group by category and calculate aggregate value
      const groupedData = groupByColumn(data, categoryColumn, numericColumn);
      processedData = convertGroupedData(groupedData, categoryColumn, numericColumn)
        .sort((a, b) => b[numericColumn] - a[numericColumn]);
      
      explanation = `Comparison of ${numericColumn} by ${categoryColumn}. This visualization shows the distribution of ${numericColumn} across different ${categoryColumn} categories.`;
    }
  }
  
  // Final fallback if we couldn't determine appropriate columns
  if (!xColumn || !yColumn || processedData.length === 0) {
    // Create simple count chart of the first categorical column
    const fallbackColumn = findBestCategoryColumn(data, columns) || columns[0];
    
    xColumn = fallbackColumn;
    yColumn = 'count';
    
    const counts: Record<string, number> = {};
    data.forEach(row => {
      const value = String(row[fallbackColumn] || 'Unknown');
      counts[value] = (counts[value] || 0) + 1;
    });
    
    processedData = Object.entries(counts)
      .map(([key, count]) => ({ [fallbackColumn]: key, count: count }))
      .sort((a, b) => b.count - a.count);
    
    // If there are too many categories, limit them
    if (processedData.length > 10) {
      processedData = processedData.slice(0, 10);
    }
    
    explanation = `Distribution of ${fallbackColumn} values. This chart shows the count of different ${fallbackColumn} categories in the dataset.`;
  }
  
  return {
    chartType,
    chart_type: chartType,
    xAxis: xColumn,
    x_axis: xColumn,
    yAxis: yColumn,
    y_axis: yColumn,
    data: processedData,
    explanation,
    chart_title: explanation.split('.')[0],
    columns: Object.keys(processedData[0]),
    color_scheme: 'professional',
  };
}

// Helper function to find a suitable categorical column
function findBestCategoryColumn(data: any[], columns: string[]): string {
  // First look for columns with names suggesting categories
  const categoryNameHints = ['category', 'type', 'class', 'group', 'segment', 'name', 'id'];
  for (const hint of categoryNameHints) {
    const match = columns.find(col => col.toLowerCase().includes(hint));
    if (match) return match;
  }
  
  // If no match by name, find columns with low cardinality (few unique values)
  const columnCounts = columns.map(column => {
    const uniqueValues = new Set();
    for (let i = 0; i < Math.min(data.length, 100); i++) {
      uniqueValues.add(String(data[i][column]));
    }
    return { column, count: uniqueValues.size };
  });
  
  columnCounts.sort((a, b) => a.count - b.count);
  
  // Return column with fewest unique values (likely categorical)
  return columnCounts[0]?.column || columns[0];
}

// Helper function to find a suitable numeric column
function findBestNumericColumn(data: any[], columns: string[]): string {
  // First look for columns with names suggesting numeric values
  const numericNameHints = ['value', 'count', 'amount', 'price', 'cost', 'quantity', 'number', 'rate', 'score'];
  for (const hint of numericNameHints) {
    const match = columns.find(col => col.toLowerCase().includes(hint));
    if (match) return match;
  }
  
  // If no match by name, find columns with numeric values
  for (const column of columns) {
    if (data.length > 0 && !isNaN(Number(data[0][column]))) {
      return column;
    }
  }
  
  return columns[columns.length - 1];
}

// Group data by a column and aggregate another column
function groupByColumn(data: any[], groupByColumn: string, valueColumn: string): Record<string, number[]> {
  const result: Record<string, number[]> = {};
  
  data.forEach(row => {
    const key = String(row[groupByColumn] || 'Unknown');
    const value = parseFloat(row[valueColumn]);
    
    if (!isNaN(value)) {
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(value);
    }
  });
  
  return result;
}

// Convert grouped data to an array format suitable for charts
function convertGroupedData(groupedData: Record<string, number[]>, keyColumn: string, valueColumn: string): any[] {
  return Object.entries(groupedData)
    .map(([key, values]) => {
      // Calculate the average for the value
      const sum = values.reduce((acc, val) => acc + val, 0);
      const avg = values.length > 0 ? sum / values.length : 0;
      
      return {
        [keyColumn]: key,
        [valueColumn]: Math.round(avg * 100) / 100
      };
    });
}
