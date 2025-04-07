
/**
 * Dataset type definition
 */
export interface Dataset {
  id: string;
  name: string;
  description?: string;
  file_name: string;
  file_size: number;
  storage_type: string;
  storage_path: string;
  row_count: number;
  column_schema: Record<string, string>;
  user_id: string;
  created_at?: string;
  updated_at?: string;
  preview_data?: any[]; // Use this for temporary preview data instead of relying on a key
}

/**
 * Dataset statistics
 */
export interface StorageStats {
  totalSize: number;
  datasetCount: number;
  formattedSize: string;
  storageTypes: string[];
  totalFields: number; // This is required, not optional
}
