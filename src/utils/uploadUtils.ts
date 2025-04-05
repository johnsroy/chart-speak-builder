
import { supabase } from '@/lib/supabase';
import { dataService } from '@/services/dataService';
import { toast as sonnerToast } from "sonner";
import { verifyStorageBuckets, createStorageBuckets, testBucketPermission } from './storageUtils';

/**
 * Simulates progress for file upload
 * @param initialProgress Starting progress value
 * @param fileSize Size of the file being uploaded
 * @returns Object with progressInterval and setProgress function
 */
export const simulateProgress = (
  initialProgress: number,
  fileSize: number,
  setProgress: (value: number) => void
): NodeJS.Timeout => {
  setProgress(initialProgress);
  
  // More conservative progress simulation for large files
  const interval = fileSize > 10 * 1024 * 1024 ? 2500 : 1000; 
  const maxProgress = 70; // Leave 30% for backend processing 
  
  const progressInterval = setInterval(() => {
    setProgress(prev => {
      // Slow down progress as it gets closer to maxProgress
      if (prev >= maxProgress - 10) {
        return prev + 0.5;
      }
      if (prev >= maxProgress - 20) {
        return prev + 1;
      }
      
      return prev + (fileSize > 10 * 1024 * 1024 ? 2 : 5);
    });
  }, interval);
  
  return progressInterval;
};

/**
 * Validates user ID format
 * @param userId User ID to validate
 * @returns Valid user ID string or throws error
 */
export const validateUserId = (userId: string): string => {
  if (userId === 'test-admin-id') {
    return '00000000-0000-0000-0000-000000000000';
  } 
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    throw new Error("Invalid user ID format. Please try logging in again.");
  }
  
  return userId;
};

/**
 * Validates the file being uploaded
 * @param file File to validate
 * @returns true if valid, throws error if invalid
 */
export const validateFileForUpload = (file: File | null): boolean => {
  if (!file) {
    throw new Error("No file selected. Please select a file to upload.");
  }
  
  const validFileTypes = [
    'text/csv', 
    'application/vnd.ms-excel', 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/json'
  ];
  
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  const isCSVByExtension = fileExtension === 'csv';
  
  if (!validFileTypes.includes(file.type) && !isCSVByExtension) {
    throw new Error("Invalid file type. Please upload a CSV, Excel or JSON file.");
  }
  
  const maxSize = 100 * 1024 * 1024; // 100MB
  if (file.size > maxSize) {
    throw new Error("File too large. Please upload a file smaller than 100MB.");
  }
  
  return true;
};

/**
 * Ensures required storage buckets exist before upload
 * @returns Promise resolving to a boolean indicating if buckets exist
 */
export const ensureStorageBucketsExist = async (): Promise<boolean> => {
  console.log("Ensuring storage buckets exist before upload...");
  let bucketsVerified = await verifyStorageBuckets();
  
  if (!bucketsVerified) {
    console.log("Buckets not verified, attempting to create them...");
    
    // Try direct creation
    const bucketsCreated = await createStorageBuckets();
    
    if (!bucketsCreated) {
      console.log("Direct bucket creation failed, trying force create via edge function...");
      
      // Try force creation via edge function
      const functionUrl = `https://rehadpogugijylybwmoe.supabase.co/functions/v1/storage-manager/create-datasets-bucket`;
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error("No active session when creating storage buckets");
        throw new Error("Authentication session required for upload infrastructure setup");
      }
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({})
      });
      
      const edgeFunctionResult = await response.json();
      
      if (!edgeFunctionResult.success) {
        throw new Error("Failed to create the required storage infrastructure. Please try again later.");
      }
      
      bucketsVerified = true;
    } else {
      console.log("Direct bucket creation successful");
      bucketsVerified = true;
    }
  }
  
  return bucketsVerified;
};

/**
 * Performs the actual upload to Supabase
 * @param file File to upload
 * @param datasetName Name for the dataset
 * @param datasetDescription Optional description for the dataset
 * @param userId ID of the user uploading the file
 * @param setUploadProgress Function to update progress
 * @returns Promise resolving to the uploaded dataset
 */
export const performUpload = async (
  file: File,
  datasetName: string,
  datasetDescription: string | undefined,
  userId: string,
  setUploadProgress: (value: number) => void
) => {
  try {
    // Ensure buckets exist 
    await ensureStorageBucketsExist();
    
    // Double-check buckets exist
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) {
      console.error("Error checking buckets:", bucketsError);
      throw new Error("Failed to verify storage buckets");
    }
    
    const hasDatasetsBacket = buckets?.some(b => b.name === 'datasets');
    console.log("Final bucket check:", hasDatasetsBacket ? "datasets bucket exists" : "datasets bucket STILL MISSING");
    
    if (!hasDatasetsBacket) {
      throw new Error("Storage system could not be properly configured. Please contact support.");
    }
    
    console.log("Buckets verification successful, proceeding with upload");
    
    // Test permission before full upload 
    const permissionTestSuccess = await testBucketPermission(userId);
    if (!permissionTestSuccess) {
      throw new Error("Storage access denied. Please check your permissions.");
    }
    
    // Perform the actual upload
    const dataset = await dataService.uploadDataset(
      file, 
      datasetName, 
      datasetDescription,
      null,
      null,
      userId
    );
    
    setUploadProgress(100);
    
    sonnerToast.success("Upload successful", {
      description: `Dataset "${datasetName}" has been uploaded successfully`
    });
    
    return dataset;
  } catch (error) {
    console.error('Error in performUpload:', error);
    throw error;
  }
};

/**
 * Derives dataset name from file name
 * @param file File to get name from
 * @returns Dataset name
 */
export const getDatasetNameFromFile = (file: File): string => {
  return file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
};
