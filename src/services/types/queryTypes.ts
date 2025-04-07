
// Common QueryResult type to be used across services
export interface QueryResult {
  data: any[];
  columns: string[];
  error?: string;
  chart_type?: string;
  x_axis?: string;
  y_axis?: string;
  chart_title?: string;
  explanation?: string;
}
