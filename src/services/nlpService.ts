
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

// Improved color schemes for beautiful visualizations
const COLOR_SCHEMES = {
  purple: ['#9b87f5', '#7E69AB', '#6E59A5', '#D6BCFA', '#E5DEFF'],
  gradient: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'],
  vibrant: ['#8B5CF6', '#D946EF', '#F97316', '#0EA5E9', '#22C55E'],
  pastel: ['#FEC6A1', '#FEF7CD', '#F2FCE2', '#D3E4FD', '#FFDEE2'],
  dark: ['#1A1F2C', '#403E43', '#221F26', '#333333', '#555555']
};

// Dictionary of dataset domain specific questions
const DATASET_RECOMMENDATIONS = {
  // Sales domain recommendations
  sales: [
    "Show me the top 5 selling products",
    "What's the sales trend over the past months?",
    "Compare sales performance across different regions",
    "Which product category has the highest revenue?",
    "Show me the distribution of sales by customer segment"
  ],
  // Financial domain recommendations
  financial: [
    "What's the trend of expenses over time?",
    "Compare revenue vs expenses by quarter",
    "Show me the breakdown of costs by category",
    "Which months had the highest profit margins?",
    "Visualize the distribution of transactions by amount"
  ],
  // Marketing domain recommendations
  marketing: [
    "Which campaigns had the highest conversion rates?",
    "Compare engagement metrics across different channels",
    "Show me customer acquisition cost trends",
    "What's the distribution of customer engagement by age group?",
    "Compare click-through rates over time"
  ],
  // HR domain recommendations
  hr: [
    "Show me employee distribution by department",
    "What's the trend of employee retention over time?",
    "Compare performance ratings across teams",
    "Visualize salary distribution across job roles",
    "Which departments have the highest turnover rates?"
  ],
  // General recommendations for unknown dataset types
  general: [
    "Show me a summary of the main trends in this data",
    "Create a breakdown by category",
    "Compare the top 5 values in the dataset",
    "Show the distribution of values across categories",
    "What are the patterns over time?"
  ]
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

  // Improved local fallback if the edge function fails
  async _processQueryLocally(query: string, datasetId: string): Promise<QueryResult> {
    try {
      console.log('Using enhanced local query processing fallback');
      
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
        
        // Enhanced query processing logic
        const result = this._analyzeData(query, previewData, dataset);
        return result;
      } catch (error) {
        console.warn('Error getting dataset preview:', error);
        
        // Return smarter fallback data
        return this._generateIntelligentFallbackData(query, dataset);
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
      
      // Parse CSV data with improved handling
      const csvText = await fileData.text();
      const parsedData = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true, // Automatically convert numbers and booleans
        transformHeader: (header) => header.trim(), // Trim whitespace from headers
        transform: (value, field) => {
          // Handle empty values
          if (value === '' || value === undefined || value === null) return null;
          return value;
        }
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
    
    // Identify numeric and categorical columns with improved detection
    const numericColumns: string[] = [];
    const categoricalColumns: string[] = [];
    const dateColumns: string[] = [];
    
    // First pass: use schema types
    Object.entries(columnSchema).forEach(([column, type]) => {
      if (type === 'number' || type === 'integer') {
        numericColumns.push(column);
      } else if (type === 'date') {
        dateColumns.push(column);
      } else if (type === 'string') {
        categoricalColumns.push(column);
      }
    });
    
    // Second pass: analyze actual data if schema is insufficient
    if (data.length > 0 && (numericColumns.length === 0 || categoricalColumns.length === 0)) {
      const sampleRow = data[0];
      Object.keys(sampleRow).forEach(column => {
        if (!numericColumns.includes(column) && !categoricalColumns.includes(column) && !dateColumns.includes(column)) {
          const value = sampleRow[column];
          if (typeof value === 'number') {
            numericColumns.push(column);
          } else if (typeof value === 'string') {
            // Try to detect if this is a date column
            if (!isNaN(Date.parse(value)) && String(value).match(/^\d{4}-\d{2}-\d{2}/)) {
              dateColumns.push(column);
            } else {
              categoricalColumns.push(column);
            }
          }
        }
      });
    }
    
    // Determine chart type based on query with enhanced detection
    let chartType = this._determineChartType(queryLower, numericColumns, categoricalColumns, dateColumns);
    
    // Smart selections based on column types and query
    let categoryColumn = this._findBestCategoryColumn(queryLower, categoricalColumns, dateColumns);
    let valueColumn = this._findBestValueColumn(queryLower, numericColumns);
    
    if (!categoryColumn && dateColumns.length > 0) {
      // If no category column found but we have date columns, use date for time series
      categoryColumn = dateColumns[0];
      chartType = queryLower.includes('pie') ? 'pie' : 'line';
    }
    
    if (!categoryColumn) {
      categoryColumn = categoricalColumns[0] || Object.keys(data[0])[0];
    }
    
    if (!valueColumn) {
      valueColumn = numericColumns[0] || Object.keys(data[0]).find(key => key !== categoryColumn) || Object.keys(data[0])[0];
    }

    // Process the data - group by category and aggregate values with improved aggregation
    const aggregatedData = this._aggregateData(data, categoryColumn, valueColumn);
    
    // Convert to array format for charts, with improved sorting and limiting
    const chartData = this._prepareChartData(aggregatedData, categoryColumn, valueColumn, chartType);
    
    // Generate explanation
    const explanation = this._generateExplanation(chartType, valueColumn, categoryColumn, chartData);
    
    // Choose a color scheme based on chart type
    const colorScheme = this._selectColorScheme(chartType);
    
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
  },
  
  _determineChartType(queryLower: string, numericColumns: string[], categoricalColumns: string[], dateColumns: string[]): string {
    // Explicit mentions in the query take priority
    if (queryLower.includes('pie') || queryLower.includes('distribution') || queryLower.includes('proportion') || queryLower.includes('breakdown')) {
      return 'pie';
    } else if (queryLower.includes('line') || queryLower.includes('trend') || queryLower.includes('over time')) {
      return 'line';
    } else if (queryLower.includes('scatter') || queryLower.includes('correlation') || queryLower.includes('relationship')) {
      return 'scatter';
    } else if (queryLower.includes('bar') || queryLower.includes('compare')) {
      return 'bar';
    }
    
    // If no explicit mention, infer from data structure
    if (dateColumns.length > 0) {
      return 'line'; // Date columns often suggest time series
    } else if (categoricalColumns.length > 0 && numericColumns.length > 0) {
      return 'bar'; // Good default for category + value comparisons
    } else if (numericColumns.length >= 2) {
      return 'scatter'; // Good for comparing two numeric dimensions
    }
    
    return 'bar'; // Default fallback
  },
  
  _findBestCategoryColumn(queryLower: string, categoricalColumns: string[], dateColumns: string[]): string {
    // First check query for mentioned columns
    for (const col of [...categoricalColumns, ...dateColumns]) {
      if (queryLower.includes(col.toLowerCase())) {
        return col;
      }
    }
    
    // Look for fuzzy matches if exact match not found
    const keywords = queryLower.split(/\s+/);
    for (const col of [...categoricalColumns, ...dateColumns]) {
      const colLower = col.toLowerCase();
      for (const word of keywords) {
        if (word.length > 3 && colLower.includes(word)) {
          return col;
        }
      }
    }
    
    // Check for common category names in query
    const commonCategoryWords = ['category', 'type', 'group', 'region', 'country', 'state', 'city', 'department', 'year', 'month', 'day', 'date'];
    for (const commonWord of commonCategoryWords) {
      if (queryLower.includes(commonWord)) {
        // Find columns that match this common word
        const matchingColumn = categoricalColumns.find(col => col.toLowerCase().includes(commonWord));
        if (matchingColumn) return matchingColumn;
      }
    }
    
    // Prioritize date columns for trends
    if (queryLower.includes('trend') && dateColumns.length > 0) {
      return dateColumns[0];
    }
    
    // Return null if no good match
    return null;
  },
  
  _findBestValueColumn(queryLower: string, numericColumns: string[]): string {
    // First check direct mentions in query
    for (const col of numericColumns) {
      if (queryLower.includes(col.toLowerCase())) {
        return col;
      }
    }
    
    // Check for common measure names in query
    const commonMeasureWords = ['sales', 'revenue', 'profit', 'income', 'cost', 'price', 'amount', 'total', 'count', 'average', 'value', 'quantity', 'sum'];
    for (const commonWord of commonMeasureWords) {
      if (queryLower.includes(commonWord)) {
        // Find columns that match this common word
        const matchingColumn = numericColumns.find(col => col.toLowerCase().includes(commonWord));
        if (matchingColumn) return matchingColumn;
      }
    }
    
    // Return null if no good match
    return null;
  },
  
  _aggregateData(data: any[], categoryColumn: string, valueColumn: string): Record<string, { sum: number, count: number, values: number[] }> {
    const aggregatedData: Record<string, { sum: number, count: number, values: number[] }> = {};
    
    data.forEach(row => {
      // Skip rows with missing data
      if (row[categoryColumn] === null || row[categoryColumn] === undefined || row[valueColumn] === null || row[valueColumn] === undefined) {
        return;
      }
      
      const category = String(row[categoryColumn] || 'Unknown');
      const value = Number(row[valueColumn] || 0);
      
      if (isNaN(value)) return;
      
      if (aggregatedData[category]) {
        aggregatedData[category].sum += value;
        aggregatedData[category].count += 1;
        aggregatedData[category].values.push(value);
      } else {
        aggregatedData[category] = { 
          sum: value, 
          count: 1,
          values: [value]
        };
      }
    });
    
    return aggregatedData;
  },
  
  _prepareChartData(
    aggregatedData: Record<string, { sum: number, count: number, values: number[] }>,
    categoryColumn: string,
    valueColumn: string,
    chartType: string
  ): any[] {
    const chartData = Object.entries(aggregatedData)
      .map(([category, data]) => {
        const avg = data.sum / data.count;
        return {
          [categoryColumn]: category,
          [valueColumn]: data.sum,
          [`avg_${valueColumn}`]: avg,
          [`count_${valueColumn}`]: data.count,
        };
      });
    
    // Sort based on chart type
    if (chartType === 'pie') {
      // For pie charts, sort by value descending
      chartData.sort((a, b) => b[valueColumn] - a[valueColumn]);
    } else if (chartType === 'line' && this._isDateLike(chartData[0]?.[categoryColumn])) {
      // For date series, sort chronologically
      chartData.sort((a, b) => {
        const dateA = new Date(a[categoryColumn]).getTime();
        const dateB = new Date(b[categoryColumn]).getTime();
        return dateA - dateB;
      });
    } else {
      // Default sort by value descending
      chartData.sort((a, b) => b[valueColumn] - a[valueColumn]);
    }
    
    // Limit to top values for better visualization
    return chartType === 'line' ? chartData : chartData.slice(0, 10);
  },
  
  _isDateLike(value: any): boolean {
    if (!value) return false;
    
    // Check for YYYY-MM-DD format
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return !isNaN(Date.parse(value));
    }
    
    // Check for Date object
    if (value instanceof Date) {
      return true;
    }
    
    return false;
  },
  
  _generateExplanation(chartType: string, valueColumn: string, categoryColumn: string, chartData: any[]): string {
    let explanation = `This ${chartType} chart shows ${valueColumn} by ${categoryColumn}. `;
    
    if (chartData.length === 0) {
      return explanation + "No data available for analysis.";
    }
    
    if (chartType === 'pie') {
      const topCategory = chartData[0][categoryColumn];
      const topValue = chartData[0][valueColumn];
      explanation += `${topCategory} has the largest proportion with a value of ${topValue}.`;
    } else if (chartType === 'line') {
      const trend = this._detectTrend(chartData.map(item => item[valueColumn]));
      explanation += `The overall trend is ${trend}.`;
    } else if (chartType === 'bar') {
      explanation += chartData.length > 5 
        ? `Showing top ${chartData.length} values.` 
        : `Comparing all ${chartData.length} categories.`;
    } else if (chartType === 'scatter') {
      explanation += "Looking for correlations between variables.";
    }
    
    return explanation;
  },
  
  _detectTrend(values: number[]): string {
    if (values.length < 2) return "not enough data to determine";
    
    let increases = 0;
    let decreases = 0;
    
    for (let i = 1; i < values.length; i++) {
      if (values[i] > values[i-1]) increases++;
      else if (values[i] < values[i-1]) decreases++;
    }
    
    if (increases > decreases * 2) return "strongly increasing";
    if (increases > decreases) return "slightly increasing";
    if (decreases > increases * 2) return "strongly decreasing";
    if (decreases > increases) return "slightly decreasing";
    
    return "relatively stable";
  },
  
  _selectColorScheme(chartType: string): string[] {
    switch (chartType) {
      case 'pie':
        return COLOR_SCHEMES.gradient;
      case 'line':
        return COLOR_SCHEMES.purple;
      case 'scatter':
        return COLOR_SCHEMES.vibrant;
      case 'bar':
      default:
        return COLOR_SCHEMES.vibrant;
    }
  },
  
  _generateIntelligentFallbackData(query: string, dataset: Dataset): QueryResult {
    const queryLower = query.toLowerCase();
    let chartType = 'bar';
    
    // Determine chart type from query
    if (queryLower.includes('pie') || queryLower.includes('distribution')) {
      chartType = 'pie';
    } else if (queryLower.includes('line') || queryLower.includes('trend') || queryLower.includes('over time')) {
      chartType = 'line';
    } else if (queryLower.includes('scatter') || queryLower.includes('correlation')) {
      chartType = 'scatter';
    }
    
    // Generate appropriate fallback data based on dataset name and query
    const datasetNameLower = dataset.name?.toLowerCase() || '';
    const fallbackData = this._createFallbackDataFromContext(datasetNameLower, chartType);
    
    return {
      data: fallbackData.data,
      explanation: `I'm showing a simulation based on your query about "${query}". ${fallbackData.explanation}`,
      chartType: fallbackData.chartType,
      chartConfig: {
        title: fallbackData.title,
        xAxisTitle: fallbackData.xAxisTitle,
        yAxisTitle: fallbackData.yAxisTitle,
        colorScheme: fallbackData.colorScheme || COLOR_SCHEMES.vibrant,
      }
    };
  },
  
  _createFallbackDataFromContext(datasetName: string, requestedChartType: string): {
    data: any[];
    chartType: string;
    explanation: string;
    title: string;
    xAxisTitle: string;
    yAxisTitle: string;
    colorScheme?: string[];
  } {
    // Detect dataset domain from name
    const isSalesData = datasetName.includes('sale') || datasetName.includes('revenue') || datasetName.includes('product');
    const isFinancialData = datasetName.includes('financ') || datasetName.includes('budget') || datasetName.includes('expense');
    const isMarketingData = datasetName.includes('market') || datasetName.includes('campaign') || datasetName.includes('ad');
    const isHRData = datasetName.includes('employee') || datasetName.includes('hr') || datasetName.includes('staff');
    
    let chartType = requestedChartType;
    let categories: string[] = [];
    let yAxisTitle = 'Value';
    let xAxisTitle = 'Category';
    let title = 'Data Overview';
    let explanation = 'The actual data could not be processed, so a simulation is shown.';
    let colorScheme = COLOR_SCHEMES.vibrant;
    
    // Configure based on detected domain
    if (isSalesData) {
      categories = ['Electronics', 'Clothing', 'Food', 'Home', 'Books', 'Toys'];
      yAxisTitle = 'Sales Amount ($)';
      xAxisTitle = 'Product Category';
      title = 'Sales by Product Category';
      explanation = 'This shows a simulation of sales data across product categories.';
      colorScheme = COLOR_SCHEMES.gradient;
    } else if (isFinancialData) {
      categories = ['Q1 2024', 'Q2 2024', 'Q3 2024', 'Q4 2024', 'Q1 2025'];
      yAxisTitle = 'Amount ($)';
      xAxisTitle = 'Quarter';
      title = 'Financial Performance by Quarter';
      explanation = 'This shows a simulation of financial performance over time.';
      colorScheme = COLOR_SCHEMES.purple;
      
      if (chartType !== 'pie') {
        chartType = 'line';  // Financial data often makes more sense as a line chart
      }
    } else if (isMarketingData) {
      categories = ['Social Media', 'Email', 'Search', 'Display', 'Video', 'Print'];
      yAxisTitle = 'Conversion Rate (%)';
      xAxisTitle = 'Marketing Channel';
      title = 'Marketing Performance by Channel';
      explanation = 'This shows a simulation of marketing performance across channels.';
    } else if (isHRData) {
      categories = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Operations'];
      yAxisTitle = 'Employee Count';
      xAxisTitle = 'Department';
      title = 'Employee Distribution by Department';
      explanation = 'This shows a simulation of employee distribution across departments.';
      colorScheme = COLOR_SCHEMES.pastel;
    } else {
      // Generic categories
      categories = ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'];
      explanation = 'This shows a simulation based on the dataset.';
    }
    
    // Generate appropriate data based on chart type
    let data: any[];
    
    if (chartType === 'line') {
      // For line charts, use time-based x-axis
      if (!isFinancialData) {
        categories = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        xAxisTitle = 'Month';
      }
      
      data = categories.map((category, index) => ({
        [xAxisTitle]: category,
        [yAxisTitle]: Math.floor(Math.random() * 1000) + 500 + (index * 50) + (Math.random() * 200 - 100),
      }));
    } else if (chartType === 'pie') {
      // For pie charts, use fewer categories
      categories = categories.slice(0, 5);
      data = categories.map(category => ({
        [xAxisTitle]: category,
        [yAxisTitle]: Math.floor(Math.random() * 1000) + 100,
      }));
    } else if (chartType === 'scatter') {
      // For scatter charts, generate two dimensions
      data = Array.from({ length: 20 }, (_, i) => ({
        'X Value': Math.floor(Math.random() * 100) + 10,
        'Y Value': Math.floor(Math.random() * 100) + 10,
        'Size': Math.floor(Math.random() * 50) + 10,
        'Category': categories[Math.floor(Math.random() * categories.length)],
      }));
      xAxisTitle = 'X Value';
      yAxisTitle = 'Y Value';
    } else {
      // Bar chart (default)
      data = categories.map(category => ({
        [xAxisTitle]: category,
        [yAxisTitle]: Math.floor(Math.random() * 1000) + 100,
      }));
    }
    
    return {
      data,
      chartType,
      explanation,
      title,
      xAxisTitle,
      yAxisTitle,
      colorScheme,
    };
  },
  
  getRecommendationsForDataset(dataset: Dataset): string[] {
    // Determine the domain of the dataset based on name and columns
    const datasetName = dataset.name?.toLowerCase() || '';
    const columnNames = Object.keys(dataset.column_schema || {}).map(col => col.toLowerCase());
    
    // Check for domain indicators in dataset name and columns
    const isSalesData = 
      datasetName.includes('sale') || datasetName.includes('revenue') || datasetName.includes('product') ||
      columnNames.some(col => col.includes('sale') || col.includes('price') || col.includes('product'));
      
    const isFinancialData = 
      datasetName.includes('financ') || datasetName.includes('budget') || datasetName.includes('expense') ||
      columnNames.some(col => col.includes('cost') || col.includes('budget') || col.includes('expense'));
      
    const isMarketingData = 
      datasetName.includes('market') || datasetName.includes('campaign') || datasetName.includes('ad') ||
      columnNames.some(col => col.includes('campaign') || col.includes('click') || col.includes('conversion'));
      
    const isHRData = 
      datasetName.includes('employee') || datasetName.includes('hr') || datasetName.includes('staff') ||
      columnNames.some(col => col.includes('employee') || col.includes('salary') || col.includes('department'));
    
    // Return domain-specific recommendations or general ones
    if (isSalesData) {
      return DATASET_RECOMMENDATIONS.sales;
    } else if (isFinancialData) {
      return DATASET_RECOMMENDATIONS.financial;
    } else if (isMarketingData) {
      return DATASET_RECOMMENDATIONS.marketing; 
    } else if (isHRData) {
      return DATASET_RECOMMENDATIONS.hr;
    } else {
      return DATASET_RECOMMENDATIONS.general;
    }
  }
};
