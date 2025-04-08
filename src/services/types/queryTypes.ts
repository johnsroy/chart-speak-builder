
/**
 * Query result definition for AI and direct queries
 */
export interface QueryResult {
  data?: any[];
  columns?: Array<{name: string, type: string}> | string[];
  chartType?: string;
  chart_type?: string; // For backward compatibility
  xAxis?: string;
  x_axis?: string; // For backward compatibility
  yAxis?: string;
  y_axis?: string; // For backward compatibility
  chart_title?: string;
  explanation?: string;
  error?: string;
  query_id?: string;
  model_used?: string;
  color_scheme?: string; // Add color scheme property
  stats?: {
    min?: number;
    max?: number;
    avg?: number;
    sum?: number;
    count?: number;
  }; // Add stats property
}

