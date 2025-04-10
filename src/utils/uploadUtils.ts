import { supabase } from '@/lib/supabase';
import { dataService } from '@/services/dataService';
import { Dataset } from '@/services/types/datasetTypes';
import { parseCSV } from '@/services/utils/fileUtils';

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

/**
 * Validates user ID
 * @param userId User ID to validate
 * @returns Validated user ID
 */
export const validateUserId = (userId?: string): string => {
  if (!userId || userId.trim() === '') {
    console.warn('No user ID provided, using system account');
    return 'fe4ab121-d26c-486d-92ca-b5cc4d99e984';
  }
  
  return userId;
};

/**
 * Simulates upload progress for better user experience
 * @param startPercent Starting percentage
 * @param totalSize Total file size
 * @param setProgress Progress setter function
 * @returns Interval ID to clear when done
 */
export const simulateProgress = (
  startPercent: number, 
  totalSize: number, 
  setProgress: React.Dispatch<React.SetStateAction<number>>
): NodeJS.Timeout => {
  setProgress(startPercent);
  
  const progressInterval = setInterval(() => {
    let currentProgress = 0;
    
    setProgress(prev => {
      currentProgress = prev;
      // Move slowly to 90% to simulate upload
      if (prev < 90) {
        // Larger files should progress more slowly
        const increment = totalSize > 5 * 1024 * 1024 ? 1 : 3;
        return Math.min(90, prev + increment);
      }
      return prev;
    });
    
    // If we've reached or exceeded 90%, clear the interval
    if (currentProgress >= 90) {
      clearInterval(progressInterval);
    }
  }, 300); // Faster updates for more responsive UI
  
  return progressInterval;
};

/**
 * Performs file upload and dataset creation with chunk-based upload for large files
 */
export const performUpload = async (
  file: File,
  name: string,
  description?: string,
  userId?: string,
  onProgress?: (progress: number) => void,
  additionalProps: Record<string, any> = {}
): Promise<Dataset> => {
  try {
    console.log("Starting file upload with props:", { name, size: file.size, userId, ...additionalProps });
    
    // Use system account if no valid user ID provided
    const validUserId = validateUserId(userId);
    
    // Generate a preview_key for storage
    const timestamp = Date.now();
    const previewKey = `preview_${timestamp}_${file.name}`;
    additionalProps.preview_key = previewKey;
    
    // Store preview data in session storage
    if (file.size > 0 && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      try {
        console.log("Extracting schema and preview for file");
        
        // For large files, only process a sample of the first few MB to extract schema
        let fileText;
        if (file.size > 10 * 1024 * 1024) { // If larger than 10MB, read only first 10MB for preview
          const blob = file.slice(0, 10 * 1024 * 1024);
          fileText = await blob.text();
        } else {
          fileText = await file.text();
        }
        
        const previewData = await parseCSV(fileText, 2000);
        
        if (previewData && previewData.length > 0) {
          sessionStorage.setItem(previewKey, JSON.stringify(previewData));
          console.log("Created preview data for file, stored in session storage with key:", previewKey);
          
          // Extract column schema
          if (previewData[0]) {
            const schema: Record<string, string> = {};
            Object.keys(previewData[0]).forEach(key => {
              const value = previewData[0][key];
              schema[key] = typeof value === 'number' ? 'number' : 
                            typeof value === 'boolean' ? 'boolean' :
                            'string';
            });
            additionalProps.column_schema = schema;
            console.log("Extracted column schema for file");
          }
          
          // Cache data for direct access after upload
          const datasetCacheKey = `dataset_${timestamp}`;
          try {
            sessionStorage.setItem(datasetCacheKey, JSON.stringify(previewData));
            console.log(`Data cached with key ${datasetCacheKey} for future dataset access`);
            additionalProps.dataset_cache_key = datasetCacheKey;
          } catch (cacheError) {
            console.warn("Failed to cache dataset:", cacheError);
          }
        }
      } catch (previewErr) {
        console.warn("Failed to extract preview/schema for file:", previewErr);
      }
    }
    
    // Setup progress tracking
    if (onProgress) {
      const progressHandler = (progress: number) => {
        console.log(`Upload progress: ${progress}%`);
        onProgress(progress);
      };
      
      // Start with 10% to show immediate feedback
      progressHandler(10);
      
      // Setup progress simulation
      const progressInterval = setInterval(() => {
        progressHandler(Math.min(85, (Math.random() * 20) + 20));
      }, 500);
      
      // Clean up interval after upload completes or fails
      setTimeout(() => clearInterval(progressInterval), 30000); // Safety timeout
      
      // Attach the progress interval to additionalProps so we can clear it when done
      additionalProps._progressInterval = progressInterval;
    }
    
    // For large files, we need to use chunked upload
    let storageUrl: string;
    let storagePath: string;
    const fileExt = file.name.split('.').pop() || '';
    const safeFileName = `${name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.${fileExt}`;
    const filePath = `uploads/${validUserId}/${safeFileName}`;
    
    if (file.size > 50 * 1024 * 1024) { // For files > 50MB use chunked upload
      console.log("Using chunked upload for large file");
      const chunkSize = 10 * 1024 * 1024; // 10MB chunks
      const totalChunks = Math.ceil(file.size / chunkSize);
      
      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * chunkSize;
        const end = Math.min(file.size, start + chunkSize);
        const chunk = file.slice(start, end);
        
        const { error } = await supabase.storage
          .from('datasets')
          .upload(`${filePath}_chunk_${chunkIndex}`, chunk, {
            upsert: true,
          });
          
        if (error) {
          throw new Error(`Error uploading chunk ${chunkIndex}: ${error.message}`);
        }
        
        // Update progress based on uploaded chunks
        if (onProgress) {
          const chunkProgress = Math.min(85, 10 + (75 * (chunkIndex + 1) / totalChunks));
          onProgress(chunkProgress);
        }
      }
      
      // For now, we'll just store the path to the first chunk - in a real implementation
      // you would need a server-side process to combine these chunks
      storagePath = filePath;
      storageUrl = supabase.storage.from('datasets').getPublicUrl(filePath + '_chunk_0').data.publicUrl;
      
      console.log("Chunked upload completed successfully");
    } else {
      // Standard upload for smaller files
      const { data, error } = await supabase.storage
        .from('datasets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (error) {
        throw new Error(`Could not upload file to storage: ${error.message}`);
      }
      
      storagePath = filePath;
      storageUrl = supabase.storage.from('datasets').getPublicUrl(filePath).data.publicUrl;
    }
    
    if (onProgress) {
      onProgress(90);
    }
    
    // Create dataset entry
    const { data: datasetData, error: datasetError } = await supabase
      .from('datasets')
      .insert([
        {
          name: name,
          description: description,
          file_name: file.name,
          file_size: file.size,
          storage_path: storagePath,
          storage_url: storageUrl,
          storage_type: 'datasets',
          user_id: validUserId,
          column_schema: additionalProps.column_schema,
          is_large_file: file.size > 50 * 1024 * 1024
        }
      ])
      .select('id')
      .single();
      
    if (datasetError) {
      // Clean up storage if metadata insertion fails
      try {
        await supabase.storage.from('datasets').remove([storagePath]);
      } catch (cleanupError) {
        console.error("Error cleaning up storage after failed dataset creation:", cleanupError);
      }
      throw new Error(`Could not save dataset metadata: ${datasetError.message}`);
    }
    
    // Clean up progress interval if it exists
    if (additionalProps._progressInterval) {
      clearInterval(additionalProps._progressInterval);
    }
    
    // Set final progress to 100%
    if (onProgress) {
      onProgress(100);
    }
    
    // Return complete dataset object
    const { data: fullDataset, error: getDatasetError } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', datasetData.id)
      .single();
      
    if (getDatasetError) {
      console.warn("Could not fetch complete dataset after creation:", getDatasetError);
      return datasetData as Dataset;
    }
    
    return fullDataset as Dataset;
  } catch (error) {
    console.error("Error during upload:", error);
    
    // Set progress to 0 to indicate failure
    if (onProgress) {
      onProgress(0);
    }
    
    throw error;
  }
};
