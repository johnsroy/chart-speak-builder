
import { supabase } from '@/lib/supabase';

// Increase file size limit to support GB-sized files
// Note: This is the limit for the file upload component, not Supabase storage
export const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB

/**
 * Validates file for upload
 * @param file The file to validate
 * @throws Error if file is invalid
 */
export const validateFileForUpload = (file: File): void => {
  if (!file) {
    throw new Error('No file selected');
  }
  
  // Check file type
  const allowedTypes = [
    'text/csv', 
    'application/json',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  const allowedExtensions = ['.csv', '.json', '.xls', '.xlsx'];
  
  const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  
  if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
    throw new Error(`Unsupported file type: ${file.type || fileExtension}. Please upload a CSV, JSON, or Excel file.`);
  }
};

/**
 * Extracts dataset name from file name
 * @param file File object
 * @returns Dataset name without extension
 */
export const getDatasetNameFromFile = (file: File): string => {
  const fileName = file.name;
  const lastDot = fileName.lastIndexOf('.');
  
  if (lastDot === -1) {
    return fileName;
  }
  
  // Remove extension and replace underscores with spaces
  return fileName.substring(0, lastDot).replace(/_/g, '_');
};
