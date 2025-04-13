
/**
 * Result of a storage upload operation
 */
export interface UploadResult {
  storageUrl: string;
  storagePath: string;
}

/**
 * Progress callback function type
 */
export type ProgressCallback = (progress: number) => void;

/**
 * Chunk upload response
 */
export interface ChunkUploadResponse {
  success: boolean;
  path?: string;
  error?: string;
}
