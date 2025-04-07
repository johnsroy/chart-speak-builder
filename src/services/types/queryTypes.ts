
// Common QueryResult type to be used across services
export interface QueryResult {
  data: any[];
  columns: string[];
  error?: string;
  chart_type?: string;
  chartType?: string; // For easier component usage
  x_axis?: string;
  y_axis?: string;
  xAxis?: string; // Alias for x_axis for easier component usage
  yAxis?: string; // Alias for y_axis for easier component usage
  chart_title?: string;
  explanation?: string;
  query_id?: string; // Added to store the ID of saved queries
  chartConfig?: {
    title?: string;
    subtitle?: string;
    xAxis?: string;
    yAxis?: string;
    xAxisTitle?: string;
    yAxisTitle?: string;
  };
}
