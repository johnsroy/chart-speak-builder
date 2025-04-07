
// Common QueryResult type to be used across services
export interface QueryResult {
  data: any[];
  columns: string[];
  error?: string;
  chart_type?: string;
  chartType?: string; // For easier component usage
  x_axis?: string;
  y_axis?: string;
  chart_title?: string;
  explanation?: string;
  chartConfig?: {
    title?: string;
    subtitle?: string;
    xAxis?: string;
    yAxis?: string;
    xAxisTitle?: string;
    yAxisTitle?: string;
  };
}
