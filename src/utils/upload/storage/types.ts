
/**
 * Result of a successful upload
 */
export interface UploadResult {
  storageUrl: string;
  storagePath: string;
}

/**
 * Progress tracking callback
 */
export type ProgressCallback = (progress: number) => void;

/**
 * Internal progress tracking options
 */
export interface ProgressTrackingOptions {
  lastProgressValue: number;
  progressRollbacks: number;
  progressValue: number;
  progressInterval?: NodeJS.Timeout;
}
