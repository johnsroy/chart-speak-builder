import { supabase } from '@/lib/supabase';
import { toast } from "sonner";
import { Dataset, StorageStats } from '@/services/types/datasetTypes';

/**
 * Verifies that all required storage buckets exist
 * @returns A promise resolving to true if all buckets exist, false otherwise
 */
export const verifyStorageBuckets = async (): Promise<boolean> => {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error("Error listing buckets:", error.message);
      return false;
    }
    
    const requiredBuckets = ['datasets', 'secure', 'cold_storage'];
    const existingBuckets = buckets?.map(bucket => bucket.name) || [];
    
    console.log("Existing buckets:", existingBuckets);
    
    const missingBuckets = requiredBuckets.filter(
      bucketName => !existingBuckets.includes(bucketName)
    );
    
    console.log("Missing buckets:", missingBuckets);
    
    return missingBuckets.length === 0;
  } catch (error) {
    console.error("Error verifying buckets:", error);
    return false;
  }
};

/**
 * Creates required storage buckets directly using the Supabase API
 * This is now just a fallback method, the edge function is preferred
 * @returns A promise resolving to true if all buckets were created, false otherwise
 */
export const createStorageBuckets = async (): Promise<boolean> => {
  try {
    console.log("Attempting to create buckets via direct API...");
    const requiredBuckets = ['datasets', 'secure', 'cold_storage'];
    const existingBuckets = await getBucketNames();
    const results = [];
    
    for (const bucketName of requiredBuckets) {
      if (!existingBuckets.includes(bucketName)) {
        try {
          const { error } = await supabase.storage.createBucket(bucketName, {
            public: true,
            fileSizeLimit: 100 * 1024 * 1024 // 100MB limit
          });
          
          results.push({
            bucketName,
            success: !error,
            error: error?.message
          });
          
          if (error) {
            console.error(`Error creating bucket ${bucketName}:`, error.message);
          } else {
            console.log(`Successfully created bucket: ${bucketName}`);
          }
        } catch (bucketError) {
          console.error(`Exception creating bucket ${bucketName}:`, bucketError);
          results.push({
            bucketName,
            success: false,
            error: bucketError instanceof Error ? bucketError.message : String(bucketError)
          });
        }
      } else {
        results.push({
          bucketName,
          success: true,
          message: "Bucket already exists"
        });
      }
    }
    
    return results.some(result => result.success);
  } catch (error) {
    console.error("Error creating buckets:", error);
    return false;
  }
};

/**
 * Gets the names of all existing buckets
 * @returns Array of bucket names
 */
const getBucketNames = async (): Promise<string[]> => {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error("Error listing buckets:", error.message);
      return [];
    }
    
    return buckets?.map(bucket => bucket.name) || [];
  } catch (error) {
    console.error("Error getting bucket names:", error);
    return [];
  }
};

/**
 * Sets up storage buckets using the edge function or direct API
 */
export const setupStorageBuckets = async () => {
  try {
    console.log("Setting up storage buckets...");
    
    // Try direct API approach first
    const success = await createStorageBuckets();
    
    if (success) {
      return {
        success,
        message: "Storage buckets created via API"
      };
    }
    
    // If direct creation fails, try edge function as fallback
    try {
      const result = await callStorageManager('force-create-buckets');
      
      if (result && result.success) {
        return result;
      }
    } catch (edgeError) {
      console.warn("Edge function approach failed:", edgeError);
    }
    
    console.log("All storage setup attempts failed. Proceeding without storage initialization.");
    
    return {
      success: false,
      message: "All storage setup attempts failed"
    };
  } catch (error) {
    console.error("Failed to set up storage buckets:", error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

/**
 * Accurately calculates storage statistics
 * @param datasets Array of dataset objects
 * @returns StorageStats object with accurate statistics
 */
export const calculateAccurateStorageStats = (datasets: Dataset[]): StorageStats => {
  try {
    if (!Array.isArray(datasets)) {
      console.warn("calculateAccurateStorageStats received invalid datasets:", datasets);
      return {
        totalSize: 0,
        datasetCount: 0,
        formattedSize: '0 B',
        storageTypes: [],
        totalFields: 0
      };
    }
    
    // Remove duplicates by keeping only the latest version of each file
    const uniqueDatasets = getUniqueDatasetsByFilename(datasets);
    
    // Calculate total storage size
    const totalSize = uniqueDatasets.reduce((sum, dataset) => sum + (dataset.file_size || 0), 0);
    
    // Count total fields across all datasets
    const totalFields = uniqueDatasets.reduce(
      (sum, dataset) => sum + (dataset?.column_schema ? Object.keys(dataset.column_schema).length : 0), 
      0
    );
    
    // Get storage types
    const storageTypes = Array.from(new Set(uniqueDatasets.map(d => d.storage_type || 'unknown')));
    
    return {
      totalSize,
      datasetCount: uniqueDatasets.length,
      formattedSize: formatByteSize(totalSize),
      storageTypes,
      totalFields
    };
  } catch (error) {
    console.error('Error calculating storage stats:', error);
    return {
      totalSize: 0,
      datasetCount: 0,
      formattedSize: '0 B',
      storageTypes: [],
      totalFields: 0
    };
  }
};

/**
 * Format byte size to human readable format
 * @param bytes Size in bytes
 * @returns Formatted size string (e.g., "1.5 MB")
 */
export const formatByteSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

/**
 * Get unique datasets by filename, keeping only the latest version
 * @param datasets Array of all datasets
 * @returns Array of unique datasets (latest version of each file)
 */
export const getUniqueDatasetsByFilename = (datasets: any[]): any[] => {
  if (!datasets || !Array.isArray(datasets) || datasets.length === 0) {
    return [];
  }
  
  // Create a Map with file_name as the key and the latest dataset as the value
  const uniqueDatasets = new Map();
  
  // Sort datasets by date (newest first) before processing
  const sortedDatasets = [...datasets].sort((a, b) => {
    const dateA = new Date(a.updated_at || a.created_at || 0).getTime();
    const dateB = new Date(b.updated_at || b.created_at || 0).getTime();
    return dateB - dateA; // newest first
  });
  
  // For each dataset, only keep the latest one with the same file_name
  for (const dataset of sortedDatasets) {
    if (dataset && dataset.file_name && !uniqueDatasets.has(dataset.file_name)) {
      uniqueDatasets.set(dataset.file_name, dataset);
    }
  }
  
  // Convert Map values back to an array
  return Array.from(uniqueDatasets.values());
};

/**
 * Calls the storage-manager edge function
 * @param action The action to call
 * @param options Additional options for the request
 * @returns Promise resolving to the function result
 */
export const callStorageManager = async (action: string, options: any = {}) => {
  try {
    console.log(`Calling storage manager: ${action}`);
    
    // Prepare the request body with proper JSON
    const body = { action, ...options };
    
    // Make the request to the edge function with proper headers
    const { data, error } = await supabase.functions.invoke('storage-manager', {
      method: 'POST',
      body, 
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (error) {
      console.error(`Storage manager ${action} failed:`, error);
      return { success: false, message: error.message || "Unknown error" };
    }
    
    console.log(`Storage manager ${action} result:`, data);
    return data || { success: true };
  } catch (error) {
    console.error(`Storage manager ${action} failed:`, error);
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
};
