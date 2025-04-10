
export interface SchemaPreview {
  [columnName: string]: string;
}

export interface UseFileUploadResult {
  dragActive: boolean;
  selectedFile: File | null;
  datasetName: string;
  datasetDescription: string;
  isUploading: boolean;
  uploadProgress: number;
  uploadError: string | null;
  schemaPreview: SchemaPreview | null;
  uploadedDatasetId: string | null;
  showVisualizeAfterUpload: boolean;
  showRedirectDialog: boolean;
  showOverwriteConfirm: boolean;
  overwriteInProgress: boolean;
  selectedStorage: string | null;
  handleDrag: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setDatasetName: (name: string) => void;
  setDatasetDescription: (desc: string) => void;
  handleUpload: (isRetry?: boolean, userId?: string) => Promise<void>;
  retryUpload: (isRetry?: boolean, userId?: string) => Promise<void>;
  setShowVisualizeAfterUpload: (show: boolean) => void;
  setShowRedirectDialog: (show: boolean) => void;
  setSelectedStorage: (storage: string | null) => void;
  handleOverwriteConfirm: (isRetry?: boolean, userId?: string) => Promise<void>;
  handleOverwriteCancel: () => void;
  verifyStorageBucket: () => Promise<boolean>;
  createStorageBucketIfNeeded: () => Promise<boolean>;
}

export interface FileUploadState {
  dragActive: boolean;
  selectedFile: File | null;
  datasetName: string;
  datasetDescription: string;
  isUploading: boolean;
  uploadProgress: number;
  uploadError: string | null;
  schemaPreview: SchemaPreview | null;
  uploadedDatasetId: string | null;
  showVisualizeAfterUpload: boolean;
  showRedirectDialog: boolean;
  showOverwriteConfirm: boolean;
  overwriteInProgress: boolean;
  selectedStorage: string | null;
}
