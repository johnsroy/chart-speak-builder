
// Define all available chart types
export type ChartType = 
  'bar' | 
  'line' | 
  'pie' | 
  'scatter' | 
  'area' | 
  'column' | 
  'donut' | 
  'stacked' | 
  'table' |
  'polar' |
  'gauge' |
  'heatmap' |
  'treemap' |
  'waterfall' |
  'funnel' |
  'sankey' |
  'bubble';

// Function to suggest chart types based on data
export function getSuitableChartTypes(data: any[]): ChartType[] {
  if (!data || data.length === 0) {
    return ['bar', 'line', 'table'];
  }

  const sampleRow = data[0];
  const columns = Object.keys(sampleRow);
  const numericColumns = columns.filter(col => typeof sampleRow[col] === 'number');
  const dateColumns = columns.filter(col => {
    const value = sampleRow[col];
    return typeof value === 'string' && 
      (value.match(/^\d{4}-\d{2}-\d{2}/) || // ISO date format
       value.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}/)); // MM/DD/YYYY
  });
  
  const categoricalColumns = columns.filter(col => {
    if (typeof sampleRow[col] !== 'string') return false;
    const uniqueValues = new Set(data.map(row => row[col]));
    return uniqueValues.size < Math.min(data.length * 0.5, 20); // Less than 50% unique values, max 20
  });
  
  // Check data dimensions and structure
  const hasMultipleCategories = categoricalColumns.length >= 2;
  const hasTimeData = dateColumns.length > 0;
  const hasNumericData = numericColumns.length > 0;
  const smallDataset = data.length <= 10;
  const largeDataset = data.length >= 50;
  const hasHierarchicalData = columns.some(col => sampleRow[col] && typeof sampleRow[col] === 'object');

  // Build recommendation array based on data characteristics
  const recommendations: ChartType[] = [];
  
  // Always include these basic visualization types
  recommendations.push('table'); // Tables are universally applicable
  
  if (hasNumericData) {
    if (hasTimeData || largeDataset) {
      // Time series or large datasets work well with line charts
      recommendations.push('line');
      recommendations.push('area');
    }
    
    if (!largeDataset) {
      // Smaller datasets work well with bar/column charts
      recommendations.push('bar');
      recommendations.push('column');
    }
    
    if (smallDataset && categoricalColumns.length > 0) {
      // Small categorical data works well with pie/donut
      recommendations.push('pie');
      recommendations.push('donut');
    }
    
    if (hasMultipleCategories) {
      // Multiple categories work well with stacked charts and heatmaps
      recommendations.push('stacked');
      recommendations.push('heatmap');
    }
    
    if (numericColumns.length >= 2) {
      // Multiple numeric columns are good for scatter plots
      recommendations.push('scatter');
      recommendations.push('bubble');
    }
    
    if (smallDataset) {
      // Small datasets with numbers work well with many chart types
      recommendations.push('polar');
      recommendations.push('gauge');
    }
    
    // Add advanced visualizations
    if (categoricalColumns.length > 0 && smallDataset) {
      recommendations.push('treemap');
      recommendations.push('waterfall');
    }
    
    if (categoricalColumns.length >= 2 && smallDataset) {
      recommendations.push('sankey');
      recommendations.push('funnel');
    }
  }

  // Ensure we have some recommendations
  if (recommendations.length === 0) {
    return ['bar', 'line', 'table']; // Default fallback
  }
  
  return Array.from(new Set(recommendations));
}

// Get display name for chart type
export function getChartTypeName(chartType: ChartType): string {
  switch (chartType) {
    case 'bar': return 'Bar Chart';
    case 'line': return 'Line Chart';
    case 'pie': return 'Pie Chart';
    case 'scatter': return 'Scatter Plot';
    case 'area': return 'Area Chart';
    case 'column': return 'Column Chart';
    case 'donut': return 'Donut Chart';
    case 'stacked': return 'Stacked Bar';
    case 'table': return 'Data Table';
    case 'polar': return 'Polar Chart';
    case 'gauge': return 'Gauge Chart';
    case 'heatmap': return 'Heat Map';
    case 'treemap': return 'Tree Map';
    case 'waterfall': return 'Waterfall Chart';
    case 'funnel': return 'Funnel Chart';
    case 'sankey': return 'Sankey Diagram';
    case 'bubble': return 'Bubble Chart';
    default: return 'Chart';
  }
}
