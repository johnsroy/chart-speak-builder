import { Dataset } from '@/services/types/datasetTypes';

export type ChartType = 
  | 'bar' 
  | 'line' 
  | 'pie' 
  | 'scatter'
  | 'area'
  | 'bubble'
  | 'waterfall'
  | 'gantt'
  | 'boxplot'
  | 'histogram'
  | 'bullet'
  | 'column'
  | 'donut'
  | 'radar'
  | 'stacked'
  | 'treemap'
  | 'heatmap'
  | 'funnel'
  | 'pictorial'
  | 'pyramid'
  | 'density'
  | 'dotplot'
  | 'gauge'
  | 'flowchart'
  | 'table';

export interface ChartTypeOption {
  id: ChartType;
  name: string;
  icon: string;
  description: string;
  suitableFor: string[];
  requiresData: string[];
}

export const CHART_TYPES: ChartTypeOption[] = [
  {
    id: 'bar',
    name: 'Bar Chart',
    icon: '/lovable-uploads/8fc4f803-7bd8-41a7-a9ab-a52f9d5e3e0b.png',
    description: 'Compare values across categories',
    suitableFor: ['categorical', 'comparison'],
    requiresData: ['categorical', 'numeric']
  },
  {
    id: 'line',
    name: 'Line Graph',
    icon: '/lovable-uploads/8fc4f803-7bd8-41a7-a9ab-a52f9d5e3e0b.png',
    description: 'Show trends over time or continuous data',
    suitableFor: ['time-series', 'trends', 'continuous'],
    requiresData: ['temporal', 'numeric']
  },
  {
    id: 'pie',
    name: 'Pie Chart',
    icon: '/lovable-uploads/8fc4f803-7bd8-41a7-a9ab-a52f9d5e3e0b.png',
    description: 'Show proportion or percentage distribution',
    suitableFor: ['composition', 'percentage', 'proportion'],
    requiresData: ['categorical', 'numeric']
  },
  {
    id: 'scatter',
    name: 'Scatter Plot',
    icon: '/lovable-uploads/8fc4f803-7bd8-41a7-a9ab-a52f9d5e3e0b.png',
    description: 'Show relationship between two variables',
    suitableFor: ['correlation', 'distribution', 'relationship'],
    requiresData: ['numeric', 'numeric']
  },
  {
    id: 'area',
    name: 'Area Chart',
    icon: '/lovable-uploads/8fc4f803-7bd8-41a7-a9ab-a52f9d5e3e0b.png',
    description: 'Show trends with filled areas below lines',
    suitableFor: ['time-series', 'cumulative', 'stacked'],
    requiresData: ['temporal', 'numeric']
  },
  {
    id: 'bubble',
    name: 'Bubble Chart',
    icon: '/lovable-uploads/8fc4f803-7bd8-41a7-a9ab-a52f9d5e3e0b.png',
    description: 'Compare three dimensions of data',
    suitableFor: ['multi-variable', 'comparison'],
    requiresData: ['numeric', 'numeric', 'numeric']
  },
  {
    id: 'column',
    name: 'Column Chart',
    icon: '/lovable-uploads/8fc4f803-7bd8-41a7-a9ab-a52f9d5e3e0b.png',
    description: 'Compare values across categories (vertical)',
    suitableFor: ['categorical', 'comparison'],
    requiresData: ['categorical', 'numeric']
  },
  {
    id: 'donut',
    name: 'Donut Chart',
    icon: '/lovable-uploads/8fc4f803-7bd8-41a7-a9ab-a52f9d5e3e0b.png',
    description: 'Show composition with a hole in the center',
    suitableFor: ['composition', 'percentage', 'proportion'],
    requiresData: ['categorical', 'numeric']
  },
  {
    id: 'stacked',
    name: 'Stacked Bars',
    icon: '/lovable-uploads/8fc4f803-7bd8-41a7-a9ab-a52f9d5e3e0b.png',
    description: 'Show composition and comparison together',
    suitableFor: ['composition', 'comparison', 'stacked'],
    requiresData: ['categorical', 'numeric', 'categorical']
  }
];

/**
 * Analyzes the dataset structure and returns a list of suitable chart types
 */
export const getSuitableChartTypes = (
  dataPreview: any[] | null, 
  dataset?: Dataset
): ChartType[] => {
  if (!dataPreview || dataPreview.length === 0) return ['bar', 'line', 'pie'];
  
  // Get information about the columns
  const firstRow = dataPreview[0];
  const columns = Object.keys(firstRow);
  
  // Categorize columns based on data type
  const categoricalColumns: string[] = [];
  const numericColumns: string[] = [];
  const dateColumns: string[] = [];
  
  columns.forEach(col => {
    const value = firstRow[col];
    
    // Check if column looks like a date
    if (typeof value === 'string' && 
        (value.match(/^\d{4}-\d{2}-\d{2}/) || // ISO date
         value.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}/))) { // MM/DD/YYYY
      dateColumns.push(col);
    }
    // Check if column is numeric
    else if (typeof value === 'number' || 
             (typeof value === 'string' && !isNaN(parseFloat(value)))) {
      numericColumns.push(col);
    }
    // Otherwise consider it categorical
    else {
      categoricalColumns.push(col);
    }
  });
  
  console.log("Detected column types:", {
    categorical: categoricalColumns,
    numeric: numericColumns,
    date: dateColumns
  });
  
  // Determine suitable chart types based on data structure
  const suitableCharts: ChartType[] = [];
  
  // Basic chart types almost always suitable
  suitableCharts.push('bar');
  
  // If we have at least one categorical and one numeric column
  if (categoricalColumns.length > 0 && numericColumns.length > 0) {
    suitableCharts.push('pie', 'column', 'donut');
  }
  
  // If we have at least one date column and one numeric column
  if (dateColumns.length > 0 && numericColumns.length > 0) {
    suitableCharts.push('line', 'area');
  }
  
  // If we have at least two numeric columns
  if (numericColumns.length >= 2) {
    suitableCharts.push('scatter');
  }
  
  // If we have multiple categories and numeric values
  if (categoricalColumns.length >= 2 && numericColumns.length > 0) {
    suitableCharts.push('stacked');
  }
  
  // If we have at least three numeric columns
  if (numericColumns.length >= 3) {
    suitableCharts.push('bubble');
  }
  
  // Always allow table view
  suitableCharts.push('table');
  
  console.log("Suggested chart types:", suitableCharts);
  return suitableCharts;
};

/**
 * Gets the display name for a chart type
 */
export const getChartTypeName = (chartType: ChartType): string => {
  const chart = CHART_TYPES.find(c => c.id === chartType);
  return chart ? chart.name : chartType.charAt(0).toUpperCase() + chartType.slice(1) + ' Chart';
};

/**
 * Gets icon for a chart type
 */
export const getChartTypeIcon = (chartType: ChartType) => {
  switch (chartType) {
    case 'bar':
      return 'BarChart';
    case 'line':
      return 'LineChart';
    case 'pie':
      return 'PieChart';
    case 'scatter':
      return 'CircleDot';
    case 'area':
      return 'AreaChart';
    case 'bubble':
      return 'Circle';
    case 'column':
      return 'BarChartBig';
    case 'donut':
      return 'CircleDashed';
    case 'stacked':
      return 'BarChartHorizontal';
    case 'table':
      return 'Table';
    default:
      return 'BarChart3';
  }
};
