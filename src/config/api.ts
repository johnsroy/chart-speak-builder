
/**
 * API Configuration
 * 
 * This file contains configuration for API endpoints used in the application
 */

// URL for the data processor edge function
export const dataProcessorUrl = import.meta.env.VITE_DATA_PROCESSOR_URL || '/api/data-processor';

// Default API timeout in milliseconds
export const apiTimeout = 30000; // 30 seconds

// Maximum file size for uploads (in bytes)
export const maxFileSize = 100 * 1024 * 1024; // 100 MB

// Retry configuration
export const apiRetryConfig = {
  maxRetries: 3,
  retryDelay: 1000, // 1 second
};
