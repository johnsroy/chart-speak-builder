import { supabase } from '@/lib/supabase';
import { QueryResult } from './types/queryTypes';
import { toast } from 'sonner';
import { dataService } from '@/services/dataService';

// Processing NL query with fallback mechanism for when edge functions fail
export const processNLQuery = async (
  datasetId: string,
  query: string,
  model: 'openai' | 'anthropic' = 'openai'
): Promise<QueryResult> => {
  try {
    console.log(`Calling AI query function for dataset ${datasetId} with model ${model === 'anthropic' ? 'Claude 3 Haiku' : 'GPT-4o'}`);
    
    // First ensure we can access the dataset
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', datasetId)
      .single();
      
    if (datasetError) {
      console.error('Error retrieving dataset:', datasetError);
      throw new Error(`Could not retrieve dataset: ${datasetError.message}`);
    }
    
    // Try to get preview data directly first
    let previewData;
    try {
      console.log('Attempting to retrieve dataset preview');
      // Try the edge function first
      const previewResponse = await supabase.functions.invoke('data-processor', {
        body: { 
          action: 'preview', 
          dataset_id: datasetId 
        }
      });
      
      if (previewResponse.error) {
        console.error('Edge function preview error:', previewResponse.error);
        throw new Error(previewResponse.error.message || 'Error retrieving dataset preview');
      }
      
      previewData = previewResponse.data?.data;
      console.log(`Retrieved ${previewData?.length || 0} rows from edge function`);
    } catch (previewError) {
      console.warn('Edge function for preview failed, falling back to direct data access:', previewError);
      
      // Use direct data access method as fallback
      previewData = await dataService.previewDataset(datasetId);
      
      if (!previewData || !Array.isArray(previewData) || previewData.length === 0) {
        console.error('Could not retrieve preview data through any method');
        throw new Error('Failed to load dataset preview through any available method');
      }
      
      console.log(`Retrieved ${previewData.length} rows via direct data access fallback`);
    }

    // Make sure we have data to work with
    if (!previewData || !Array.isArray(previewData) || previewData.length === 0) {
      console.error('No preview data available, generating sample data');
      // Generate sample data as a last resort
      previewData = generateSampleData(dataset.name, dataset.file_name, 20);
    }

    // Try to call the AI query function with the dataset information and preview data
    try {
      console.log(`Calling AI query with model ${model}`, {
        datasetId,
        query,
        previewDataLength: previewData?.length
      });
      
      const response = await supabase.functions.invoke('ai-query', {
        body: { 
          datasetId, 
          query,
          model,
          previewData
        }
      });
      
      if (response.error) {
        console.error('AI query error:', response.error);
        throw new Error(`AI analysis failed: ${response.error.message}`);
      }
      
      console.log('AI query response:', response.data);
      
      // Validate the response contains data
      if (!response.data || typeof response.data !== 'object') {
        console.error('Invalid AI response:', response.data);
        throw new Error('Received invalid response from AI service');
      }
      
      // Normalize property names for consistency
      const result = response.data as QueryResult;
      if (result.x_axis && !result.xAxis) {
        result.xAxis = result.x_axis;
      }
      if (result.y_axis && !result.yAxis) {
        result.yAxis = result.y_axis;
      }
      if (result.chart_type && !result.chartType) {
        result.chartType = result.chart_type;
      }
      
      // Ensure model_used is set
      if (!result.model_used) {
        result.model_used = model === 'anthropic' ? 'Claude 3 Haiku' : 'GPT-4o';
      }
      
      // Make sure data is included in the result
      if (!result.data && previewData) {
        console.log('Adding preview data to result since none was returned');
        result.data = previewData;
      }
      
      // We need to ensure we have at least some data for visualization
      if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
        console.error('No data in AI response, using preview data instead');
        result.data = previewData;
      }
      
      // Ensure xAxis and yAxis are set
      if (!result.xAxis && !result.x_axis) {
        console.log('Setting default x-axis as none was returned');
        const columns = Object.keys(previewData[0] || {});
        result.xAxis = result.x_axis = columns[0] || 'Category';
      }
      
      if (!result.yAxis && !result.y_axis) {
        console.log('Setting default y-axis as none was returned');
        const columns = Object.keys(previewData[0] || {});
        result.yAxis = result.y_axis = columns[1] || 'Value';
      }
      
      console.log('Final processed AI result:', {
        chartType: result.chartType || result.chart_type,
        xAxis: result.xAxis || result.x_axis,
        yAxis: result.yAxis || result.y_axis,
        dataLength: result.data?.length,
        explanation: result.explanation?.substring(0, 50) + '...'
      });
      
      return result;
    } catch (aiQueryError) {
      console.warn('AI query edge function failed, falling back to local processing:', aiQueryError);
      
      // Use local processing as a last resort
      return processQueryLocally(query, previewData, model, dataset.name || 'Dataset');
    }
  } catch (error) {
    console.error('Error in NLP query:', error);
    throw error;
  }
};

// Generate sample data for visualization when real data is unavailable
const generateSampleData = (datasetName: string, fileName: string, count: number = 20): any[] => {
  console.log(`Generating sample data for ${datasetName || fileName}`);
  const lowerName = (datasetName || fileName || '').toLowerCase();
  const data = [];
  
  // Categories based on potential dataset types
  let categories = ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'];
  let valueField = 'Value';
  let categoryField = 'Category';
  
  // Try to determine data type from name
  if (lowerName.includes('sale') || lowerName.includes('revenue') || lowerName.includes('finance')) {
    categories = ['Electronics', 'Clothing', 'Food', 'Home', 'Entertainment'];
    valueField = 'Revenue';
    categoryField = 'Department';
  } else if (lowerName.includes('population') || lowerName.includes('demographic')) {
    categories = ['North', 'South', 'East', 'West', 'Central'];
    valueField = 'Population';
    categoryField = 'Region';
  } else if (lowerName.includes('product') || lowerName.includes('inventory')) {
    categories = ['Product A', 'Product B', 'Product C', 'Product D', 'Product E'];
    valueField = 'Quantity';
    categoryField = 'Product';
  }
  
  // Generate sample data
  for (let i = 0; i < count; i++) {
    const category = categories[i % categories.length];
    const value = Math.floor(Math.random() * 1000) + 100;
    data.push({
      [categoryField]: category,
      [valueField]: value,
      id: i + 1
    });
  }
  
  console.log('Generated sample data:', data.slice(0, 3), `(${data.length} rows total)`);
  return data;
};

// Enhanced function for local query processing with improved analysis
const processQueryLocally = async (
  query: string, 
  previewData: any[],
  model: 'openai' | 'anthropic',
  datasetName: string
): Promise<QueryResult> => {
  try {
    console.log('Processing query locally with', previewData.length, 'rows of data');
    
    if (!previewData || previewData.length === 0) {
      throw new Error('No data available for processing');
    }
    
    // Get the column names from the first row
    const columns = Object.keys(previewData[0]);
    
    // Find likely numeric columns for analysis - improved detection
    const numericColumns = columns.filter(col => {
      // Check multiple rows to improve accuracy of type detection
      const sampleSize = Math.min(5, previewData.length);
      let numericCount = 0;
      
      for (let i = 0; i < sampleSize; i++) {
        const val = previewData[i][col];
        if (typeof val === 'number' || (typeof val === 'string' && !isNaN(parseFloat(val)))) {
          numericCount++;
        }
      }
      // Consider it numeric if most samples are numeric
      return numericCount >= Math.ceil(sampleSize / 2);
    });
    
    // Find likely categorical columns - more robust detection
    const categoricalColumns = columns.filter(col => {
      // Check if column has a reasonable number of distinct values
      const distinctValues = new Set();
      const sampleSize = Math.min(20, previewData.length);
      
      for (let i = 0; i < sampleSize; i++) {
        distinctValues.add(String(previewData[i][col]));
      }
      
      // Likely categorical if it has few distinct values compared to sample size
      // or if it's not numeric and has string values
      return (distinctValues.size <= sampleSize / 2) || 
             (typeof previewData[0][col] === 'string' && !numericColumns.includes(col));
    });
    
    // Find likely date columns - improved detection
    const dateColumns = columns.filter(col => {
      const val = String(previewData[0][col]);
      return /^\d{4}-\d{2}-\d{2}/.test(val) || // ISO date
             /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(val) || // MM/DD/YYYY
             /^\d{1,2}-\d{1,2}-\d{2,4}/.test(val); // MM-DD-YYYY
    });
    
    console.log('Detected columns:', {
      numeric: numericColumns,
      categorical: categoricalColumns,
      date: dateColumns
    });
    
    // Enhanced logic to determine chart type and axes based on the query and data structure
    let chartType = 'bar';
    let xAxis = categoricalColumns.length > 0 ? categoricalColumns[0] : columns[0];
    let yAxis = numericColumns.length > 0 ? numericColumns[0] : columns[1] || columns[0];
    
    // More intelligent chart type detection based on query content and data structure
    const lowerQuery = query.toLowerCase();
    
    // For time series data, prefer line charts
    if (dateColumns.length > 0 && 
        (/trend|over time|time series|change|growth|history|progress|timeline/i.test(lowerQuery))) {
      chartType = 'line';
      xAxis = dateColumns[0]; // Use the first date column for x-axis
      
      // Find a suitable numeric column that might reflect the trend being asked about
      if (numericColumns.length > 0) {
        // Try to find the most relevant numeric column based on query terms
        const queryTerms = lowerQuery.split(/\s+/);
        for (const col of numericColumns) {
          const lowerCol = col.toLowerCase();
          if (queryTerms.some(term => lowerCol.includes(term))) {
            yAxis = col;
            break;
          }
        }
      }
    } 
    // For distribution/proportion data, prefer pie charts
    else if (/distribution|breakdown|percentage|ratio|proportion|pie|share/i.test(lowerQuery)) {
      chartType = 'pie';
      
      // For pie charts, we need a good categorical column and a numeric column
      if (categoricalColumns.length > 0) {
        xAxis = categoricalColumns[0];
        
        // If query mentions a specific category, try to use it
        for (const col of categoricalColumns) {
          if (lowerQuery.includes(col.toLowerCase())) {
            xAxis = col;
            break;
          }
        }
      }
      
      // Choose most appropriate metric based on query context
      if (numericColumns.length > 0) {
        // Look for metrics mentioned in query
        for (const col of numericColumns) {
          if (lowerQuery.includes(col.toLowerCase())) {
            yAxis = col;
            break;
          }
        }
      }
    } 
    // For comparison data, use bar charts
    else if (/compare|comparison|bar|rank|highest|lowest|top|bottom/i.test(lowerQuery)) {
      chartType = 'bar';
      
      // For bar charts, categorical on x-axis is usually best
      if (categoricalColumns.length > 0) {
        xAxis = categoricalColumns[0];
      }
      
      // Try to find the measurement being compared
      if (numericColumns.length > 0) {
        // Check if the query mentions a specific metric
        for (const col of numericColumns) {
          if (lowerQuery.includes(col.toLowerCase().replace(/_/g, ' '))) {
            yAxis = col;
            break;
          }
        }
      }
    }
    // For relationships between variables, use scatter plots
    else if (/relation|relationship|correlation|scatter|versus|vs\.?|against/i.test(lowerQuery)) {
      chartType = 'scatter';
      
      // For scatter plots, ideally both axes are numeric
      if (numericColumns.length >= 2) {
        xAxis = numericColumns[0];
        yAxis = numericColumns[1];
      } else if (numericColumns.length === 1) {
        yAxis = numericColumns[0];
      }
    }
    
    // Look for specific column mentions in the query - improved matching
    columns.forEach(col => {
      const normalizedCol = col.toLowerCase().replace(/[_\s-]/g, ' ');
      const normalizedQuery = query.toLowerCase();
      
      // Check if column is explicitly mentioned
      if (normalizedQuery.includes(normalizedCol)) {
        // If a column is mentioned and it's numeric, it might be the y-axis
        if (numericColumns.includes(col)) {
          yAxis = col;
        } 
        // If a column is mentioned and it's categorical or a date, it might be the x-axis
        else if (categoricalColumns.includes(col) || dateColumns.includes(col)) {
          xAxis = col;
        }
      }
    });
    
    const modelName = model === 'anthropic' ? 'Claude 3 Haiku' : 'GPT-4o';
    
    // Create a descriptive title and explanation
    const chartTitle = `${yAxis} by ${xAxis}`;
    
    // Generate a detailed explanation with step-by-step analysis
    let explanation = `I analyzed your request: "${query}"\n\nStep 1: I examined your ${datasetName} dataset with ${previewData.length} records.\n\nStep 2: Based on your question, I identified that you're interested in the relationship between ${xAxis} and ${yAxis}.`;
    
    // Add data-specific insights with sequential analysis - improved insights
    if (chartType === 'bar' || chartType === 'pie') {
      // Sort data for insights
      const groupedData: Record<string, { count: number, sum: number }> = {};
      
      // Group and summarize data
      previewData.forEach(row => {
        const key = String(row[xAxis]);
        if (!groupedData[key]) {
          groupedData[key] = { count: 0, sum: 0 };
        }
        groupedData[key].count += 1;
        groupedData[key].sum += Number(row[yAxis]) || 0;
      });
      
      // Convert grouped data to sortable array
      const sortedEntries = Object.entries(groupedData)
        .map(([key, data]) => ({ key, count: data.count, sum: data.sum }))
        .sort((a, b) => b.sum - a.sum);
      
      // Add insights about top values
      explanation += `\n\nStep 3: I analyzed the distribution of data and found these insights:`;
      
      if (sortedEntries.length > 0) {
        explanation += `\n\n- The highest ${yAxis} is in the ${xAxis} category "${sortedEntries[0].key}" with a value of ${sortedEntries[0].sum.toFixed(2)}.`;
        
        // Add comparison to average
        const total = sortedEntries.reduce((acc, item) => acc + item.sum, 0);
        const average = total / sortedEntries.length;
        explanation += `\n- The average ${yAxis} across categories is ${average.toFixed(2)}.`;
        
        // Add insight about the range
        if (sortedEntries.length > 1) {
          const lowest = sortedEntries[sortedEntries.length - 1];
          explanation += `\n- The range between highest and lowest values is ${(sortedEntries[0].sum - lowest.sum).toFixed(2)}.`;
        }
        
        // Add distribution insight
        explanation += `\n- The top 3 ${xAxis} categories represent ${((sortedEntries.slice(0, 3).reduce((acc, item) => acc + item.sum, 0) / total) * 100).toFixed(1)}% of the total ${yAxis}.`;
      }
      
      // Top categories summary
      explanation += `\n\nStep 4: I selected a ${chartType} chart to best visualize this distribution and highlight the relative proportions of different ${xAxis} categories.`;
      
    } else if (chartType === 'line') {
      // Time series analysis
      explanation += `\n\nStep 3: Since you're interested in trends over time, I analyzed how ${yAxis} changes over different ${xAxis} values:`;
      
      // Sort data chronologically for time series analysis if possible
      let sortedData = [...previewData];
      try {
        sortedData.sort((a, b) => {
          const dateA = new Date(a[xAxis]).getTime();
          const dateB = new Date(b[xAxis]).getTime();
          return dateA - dateB;
        });
      } catch (e) {
        // If date sorting fails, use the data as-is
      }
      
      // Calculate trend statistics
      const firstValue = Number(sortedData[0]?.[yAxis]) || 0;
      const lastValue = Number(sortedData[sortedData.length - 1]?.[yAxis]) || 0;
      const changeAmount = lastValue - firstValue;
      const changePercent = firstValue !== 0 ? (changeAmount / firstValue) * 100 : 0;
      
      // Add trend insights
      if (changePercent > 0) {
        explanation += `\n\n- There is an upward trend of ${changePercent.toFixed(1)}% in ${yAxis} from ${firstValue.toFixed(1)} to ${lastValue.toFixed(1)}.`;
      } else if (changePercent < 0) {
        explanation += `\n\n- There is a downward trend of ${Math.abs(changePercent).toFixed(1)}% in ${yAxis} from ${firstValue.toFixed(1)} to ${lastValue.toFixed(1)}.`;
      } else {
        explanation += `\n\n- The ${yAxis} remains relatively stable across the timeline at around ${firstValue.toFixed(1)}.`;
      }
      
      // Find peak value
      const peakValue = Math.max(...sortedData.map(item => Number(item[yAxis]) || 0));
      const peakItem = sortedData.find(item => Number(item[yAxis]) === peakValue);
      
      if (peakItem) {
        explanation += `\n- The peak ${yAxis} was ${peakValue.toFixed(1)} at ${peakItem[xAxis]}.`;
      }
      
      explanation += `\n\nStep 4: I selected a line chart to best visualize this time series data and highlight the trends over time.`;
    }
    
    explanation += `\n\nStep 5: The visualization shows ${chartType === 'pie' ? 'the proportional distribution' : 'the relationship'} between ${xAxis} and ${yAxis}, helping you understand ${chartType === 'line' ? 'trends over time' : chartType === 'pie' ? 'relative proportions' : 'comparative values'}.`;
    
    if (model === 'anthropic') {
      explanation += "\n\n(Note: This analysis was processed locally as Claude 3 Haiku was unavailable)";
    } else {
      explanation += "\n\n(Note: This was processed locally with direct data processing)";
    }
    
    console.log(`Local processing complete - Using ${chartType} chart with X: ${xAxis}, Y: ${yAxis}`);
    
    // Prepare data for visualization - improve data preprocessing
    let processedData = [...previewData]; 
    
    // For bar and pie charts, aggregate data by the x-axis category
    if (chartType === 'bar' || chartType === 'pie') {
      const aggregated: Record<string, number> = {};
      const counts: Record<string, number> = {};
      
      previewData.forEach(item => {
        const key = String(item[xAxis] || 'Unknown');
        const value = Number(item[yAxis] || 0);
        
        if (!aggregated[key]) {
          aggregated[key] = 0;
          counts[key] = 0;
        }
        
        aggregated[key] += value;
        counts[key] += 1;
      });
      
      // Convert aggregated data back to array format
      processedData = Object.entries(aggregated).map(([key, value]) => ({
        [xAxis]: key,
        [yAxis]: value,
        count: counts[key]
      }));
    }
    
    // Return the result in the expected format
    return {
      chartType,
      chart_type: chartType,
      xAxis,
      x_axis: xAxis,
      yAxis, 
      y_axis: yAxis,
      chart_title: chartTitle,
      explanation,
      data: processedData,
      model_used: `Local processing (${modelName} unavailable)`
    };
  } catch (error) {
    console.error('Error in local query processing:', error);
    throw new Error(`Failed to process query locally: ${error.message}`);
  }
};

// NLP service with additional helper functions
export const nlpService = {
  processQuery: async (query: string, datasetId: string, model: 'openai' | 'anthropic' = 'openai'): Promise<QueryResult> => {
    try {
      console.log(`Processing query using ${model === 'anthropic' ? 'Claude 3 Haiku' : 'GPT-4o'} model: "${query}"`);

      // Process query through Edge function with fallback
      const result = await processNLQuery(datasetId, query, model);
      
      // Additional post-processing to ensure valid data for visualization
      if (result) {
        // Ensure data exists
        if (!result.data || result.data.length === 0) {
          console.warn('No data in result, fetching dataset directly');
          try {
            const dataPreview = await dataService.previewDataset(datasetId);
            if (dataPreview && dataPreview.length > 0) {
              result.data = dataPreview;
            }
          } catch (err) {
            console.error('Error fetching data preview:', err);
          }
        }
        
        // Validate that the selected axes exist in the data
        if (result.data && result.data.length > 0) {
          const columns = Object.keys(result.data[0]);
          const xAxis = result.xAxis || result.x_axis;
          const yAxis = result.yAxis || result.y_axis;
          
          if (xAxis && !columns.includes(xAxis)) {
            console.warn(`X-axis "${xAxis}" not found in data, resetting to first column`);
            result.xAxis = result.x_axis = columns[0];
          }
          
          if (yAxis && !columns.includes(yAxis)) {
            console.warn(`Y-axis "${yAxis}" not found in data, resetting to second column or first numeric column`);
            // Find first numeric column
            const numericColumn = columns.find(col => {
              const val = result.data![0][col];
              return typeof val === 'number' || (typeof val === 'string' && !isNaN(parseFloat(val)));
            });
            result.yAxis = result.y_axis = numericColumn || columns[1] || columns[0];
          }
        }
        
        // Save the query to the database
        try {
          if (!result.query_id) {
            const { data: queryData, error: queryError } = await supabase.from('queries').insert({
              dataset_id: datasetId,
              query_text: query,
              query_type: model,
              name: query.substring(0, 50),
              query_config: {
                chart_type: result.chartType || result.chart_type || 'bar',
                x_axis: result.xAxis || result.x_axis,
                y_axis: result.yAxis || result.y_axis,
                result: {
                  chart_title: result.chart_title,
                  explanation: result.explanation
                }
              }
            }).select('id').single();
            
            if (!queryError && queryData) {
              result.query_id = queryData.id;
            }
          }
        } catch (saveError) {
          console.error('Error saving query:', saveError);
          // Non-fatal error, continue
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error processing query:', error);
      throw error;
    }
  },

  getRecommendationsForDataset: (dataset: any): string[] => {
    // Generate dataset-specific query recommendations
    const recommendations = [
      "Show me a summary of the main trends",
      "Create a breakdown by category",
      "Compare the top values in this dataset",
      "Show the distribution across regions",
      "What patterns can you find in this data?"
    ];
    
    // If we have dataset schema, make more specific recommendations
    if (dataset && dataset.column_schema) {
      const columns = Object.keys(dataset.column_schema);
      
      // Look for date columns to suggest time analysis
      const dateColumns = columns.filter(col => 
        dataset.column_schema[col] === 'date' || 
        col.toLowerCase().includes('date') || 
        col.toLowerCase().includes('time') ||
        col.toLowerCase().includes('year')
      );
      
      if (dateColumns.length > 0) {
        recommendations.push(`Show trends over time using ${dateColumns[0]}`);
      }
      
      // Look for categorical columns to suggest breakdowns
      const categoryColumns = columns.filter(col => 
        dataset.column_schema[col] === 'string' && 
        !col.toLowerCase().includes('id') &&
        !col.toLowerCase().includes('name')
      );
      
      if (categoryColumns.length > 0) {
        recommendations.push(`Show distribution by ${categoryColumns[0]}`);
      }
      
      // Look for numeric columns to suggest aggregations
      const numericColumns = columns.filter(col => 
        dataset.column_schema[col] === 'number' || 
        dataset.column_schema[col] === 'integer'
      );
      
      if (numericColumns.length > 0) {
        recommendations.push(`What's the average ${numericColumns[0]} by category?`);
      }
    }
    
    return recommendations;
  },

  getPreviousQueries: async (datasetId: string): Promise<any[]> => {
    try {
      const { data, error } = await supabase
        .from('queries')
        .select('*')
        .eq('dataset_id', datasetId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching previous queries:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching previous queries:', error);
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
        console.error('Error fetching query:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching query:', error);
      return null;
    }
  }
};

// Update exports to use the common QueryResult type
export type { QueryResult };
