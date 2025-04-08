
import { QueryResult } from '@/services/types/queryTypes';

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  result?: QueryResult;
  model?: 'openai' | 'anthropic';
  queryId?: string;
  thinking?: string;
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
}
