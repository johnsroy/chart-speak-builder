
import { supabase } from '@/lib/supabase';

/**
 * Verifies if the required storage bucket exists
 * @returns Promise resolving to true if the bucket exists, false otherwise
 */
export const verifyStorageBucket = async (): Promise<boolean> => {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error("Error fetching storage buckets:", error);
      return false;
    }

    const bucketExists = buckets.some(bucket => bucket.name === 'datasets');
    return bucketExists;
  } catch (error) {
    console.error("Error verifying storage bucket:", error);
    return false;
  }
};

/**
 * Creates the datasets storage bucket if it doesn't exist
 * @returns Promise resolving to true if successful, false otherwise
 */
export const createStorageBucketIfNeeded = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.storage.createBucket('datasets', { public: true });
    if (error) {
      console.error("Error creating storage bucket:", error);
      return false;
    }

    console.log("Storage bucket created successfully:", data);
    return true;
  } catch (error) {
    console.error("Error initializing storage:", error);
    return false;
  }
};
