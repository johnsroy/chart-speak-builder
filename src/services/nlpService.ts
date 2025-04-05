
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';
import { Dataset } from './dataService';

export interface QueryResult {
  data: any[];
  explanation?: string;
  chartType: string;
  chartConfig?: {
    title?: string;
    xAxisTitle?: string;
    yAxisTitle?: string;
    colorScheme?: string[];
  };
}

// Default color schemes for beautiful visualizations
const COLOR_SCHEMES = {
  purple: ['#9b87f5', '#7E69AB', '#6E59A5', '#D6BCFA', '#E5DEFF'],
  gradient: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'],
  vibrant: ['#8B5CF6', '#D946EF', '#F97316', '#0EA5E9', '#22C55E'],
  pastel: ['#FEC6A1', '#FEF7CD', '#F2FCE2', '#D3E4FD', '#FFDEE2'],
  dark: ['#1A1F2C', '#403E43', '#221F26', '#333333', '#555555']
};

export const nlpService = {
  async processQuery(query: string, datasetId: string, modelType: 'openai' | 'anthropic' = 'openai'): Promise<QueryResult> {
    try {
      console.info('Calling AI query function with:', { datasetId, query, modelType });

      // Try to call the Edge Function first for AI processing
      const { data, error } = await supabase.functions.invoke('ai-query', {
        body: { datasetId, query, modelType }
      });

      if (error) {
        console.error('Error from AI query function:', error);
        console.warn('Edge function error, using fallback processing:', new Error(`AI query failed: ${error.message}`));
        
        // If the Edge Function fails, fall back to local processing
        return this._processQueryLocally(query, datasetId);
      }

      return data;
    } catch (error) {
      console.error('Error processing query:', error);
      
      // Fall back to local processing
      return this._processQueryLocally(query, datasetId);
    }
  },

  // Local fallback if the edge function fails
  async _processQueryLocally(query: string, datasetId: string): Promise<QueryResult> {
    try {
      console.log('Using local query processing fallback');
      
      // Get dataset information
      const { data: dataset, error: datasetError } = await supabase
        .from('datasets')
        .select('*')
        .eq('id', datasetId)
        .single();
      
      if (datasetError) throw datasetError;
      
      // Get dataset preview data
      try {
        const previewData = await this._getDatasetPreview(dataset);
        
        // Very basic query processing logic as fallback
        const result = this._analyzeData(query, previewData, dataset);
        return result;
      } catch (error) {
        console.warn('Error getting dataset preview:', error);
        
        // Return dummy data if we can't process
        return {
          data: [
            { category: 'Sample', value: 30 },
            { category: 'Example', value: 45 },
            { category: 'Test', value: 60 },
          ],
          explanation: `I couldn't analyze the actual data due to an error, so I'm showing sample data. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          chartType: 'bar'
        };
      }
    } catch (error) {
      console.error('Local query processing failed:', error);
      throw error;
    }
  },
  
  async _getDatasetPreview(dataset: Dataset): Promise<any[]> {
    try {
      // Download dataset from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('datasets')
        .download(dataset.storage_path);
      
      if (downloadError) {
        console.error('Storage download error:', downloadError);
        throw downloadError;
      }
      
      // Parse CSV data
      const csvText = await fileData.text();
      const parsedData = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true, // Automatically convert numbers and booleans
        transformHeader: (header) => header.trim() // Trim whitespace from headers
      });
      
      if (parsedData.errors && parsedData.errors.length > 0) {
        console.warn('CSV parsing warnings:', parsedData.errors);
      }
      
      return parsedData.data as any[];
    } catch (error) {
      console.error(`Error previewing dataset ${dataset.id}:`, error);
      throw error;
    }
  },
  
  _analyzeData(query: string, data: any[], dataset: Dataset): QueryResult {
    const queryLower = query.toLowerCase();
    const columnSchema = dataset.column_schema;
    
    // Identify numeric and categorical columns
    const numericColumns: string[] = [];
    const categoricalColumns: string[] = [];
    
    Object.entries(columnSchema).forEach(([column, type]) => {
      if (type === 'number' || type === 'integer') {
        numericColumns.push(column);
      } else if (type === 'string' || type === 'date') {
        categoricalColumns.push(column);
      }
    });
    
    // Default selections if we can't determine from the query
    const defaultCategoryColumn = categoricalColumns[0] || Object.keys(data[0])[0];
    const defaultNumericColumn = numericColumns[0] || Object.keys(data[0])[1] || Object.keys(data[0])[0];
    
    // Determine chart type based on query
    let chartType = 'bar'; // Default
    if (queryLower.includes('pie') || queryLower.includes('distribution') || queryLower.includes('proportion')) {
      chartType = 'pie';
    } else if (queryLower.includes('line') || queryLower.includes('trend') || queryLower.includes('over time')) {
      chartType = 'line';
    } else if (queryLower.includes('scatter') || queryLower.includes('correlation')) {
      chartType = 'scatter';
    }
    
    // Find column matches in the query
    let categoryColumn = defaultCategoryColumn;
    let valueColumn = defaultNumericColumn;
    
    // Try to find a category column mentioned in the query
    for (const col of categoricalColumns) {
      if (queryLower.includes(col.toLowerCase())) {
        categoryColumn = col;
        break;
      }
    }
    
    // Try to find a numeric column mentioned in the query
    for (const col of numericColumns) {
      if (queryLower.includes(col.toLowerCase())) {
        valueColumn = col;
        break;
      }
    }
    
    // Process the data - group by category and aggregate values
    const aggregatedData: Record<string, number> = {};
    
    data.forEach(row => {
      const category = String(row[categoryColumn] || 'Unknown');
      const value = Number(row[valueColumn] || 0);
      
      if (isNaN(value)) return;
      
      if (aggregatedData[category]) {
        aggregatedData[category] += value;
      } else {
        aggregatedData[category] = value;
      }
    });
    
    // Convert to array format for charts
    const chartData = Object.entries(aggregatedData)
      .map(([category, value]) => ({
        [categoryColumn]: category,
        [valueColumn]: value
      }))
      .sort((a, b) => Number(b[valueColumn]) - Number(a[valueColumn]))
      .slice(0, 10); // Limit to top 10 for better visualization
    
    // Generate explanation
    const explanation = `This ${chartType} chart shows ${valueColumn} by ${categoryColumn} based on your query. ${
      chartData.length === 10 ? 'Showing the top 10 results.' : ''
    }`;
    
    // Choose a color scheme based on chart type
    let colorScheme = COLOR_SCHEMES.vibrant;
    if (chartType === 'pie') {
      colorScheme = COLOR_SCHEMES.gradient;
    } else if (chartType === 'line') {
      colorScheme = COLOR_SCHEMES.purple;
    }
    
    return {
      data: chartData,
      explanation,
      chartType,
      chartConfig: {
        title: `${valueColumn} by ${categoryColumn}`,
        xAxisTitle: categoryColumn,
        yAxisTitle: valueColumn,
        colorScheme
      }
    };
  }
};
