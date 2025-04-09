
import { QueryResult } from '@/services/types/queryTypes';

export enum VisualizationType {
  BarChart = 'bar',
  LineChart = 'line',
  PieChart = 'pie'
}

export interface Message {
  id: string;
  sender: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  result?: AIQueryResponse;
  model?: AIModelType;
  isProcessing?: boolean;
  queryId?: string;
  thinking?: string;
  visualization?: QueryResult;  // For visualization support
  visualizationType?: VisualizationType; // For chart type
  chartData?: any[]; // For direct chart data
}

export type AIModelType = 'openai' | 'anthropic';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  result?: QueryResult;
}

export interface AIQueryResponse {
  data?: any[];
  columns?: any[];
  explanation?: string;
  chartType?: string;
  xAxis?: string;
  yAxis?: string;
  error?: string;
  chart_type?: string;
  x_axis?: string;
  y_axis?: string;
  model_used?: string;
  query_id?: string;
  dataset_id?: string; // Added this property to fix the error
}

export interface DataAnalysisResult {
  growth?: { rate: number; start: string; end: string } | null;
  decline?: { rate: number; start: string; end: string } | null;
  summaryStats?: {
    min?: number;
    max?: number;
    avg?: number;
    sum?: number;
    count?: number;
  } | null;
  insights?: string[] | null;
  color_scheme?: string;
  stats?: {
    min?: number;
    max?: number;
    avg?: number;
    sum?: number;
    count?: number;
  };
}
