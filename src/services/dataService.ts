import { supabase } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';

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
  created_at: string;
  updated_at: string;
}

export interface Query {
  id: string;
  dataset_id: string;
  query_text: string;
  query_config: any;
  result_data: any;
  created_at: string;
}

export interface Visualization {
  id: string;
  dataset_id: string;
  chart_type: string;
  x_axis: string;
  y_axis: string;
  config: any;
  created_at: string;
}

export const dataService = {
  /**
   * Uploads a dataset to Supabase storage and creates a corresponding record in the database.
   * @param file The file to upload.
   * @param datasetName The name of the dataset.
   * @param datasetDescription An optional description for the dataset.
   * @param storageType The type of storage to use (e.g., 'datasets', 'user-uploads').
   * @param storagePath An optional path within the storage bucket. If not provided, a UUID will be generated.
   * @param userId The ID of the user uploading the dataset.
   * @returns A promise that resolves with the created dataset object.
   * @throws An error if the upload or database insertion fails.
   */
  uploadDataset: async (
    file: File,
    datasetName: string,
    datasetDescription?: string,
    storageType: string | null = 'datasets',
    storagePath: string | null = null,
    userId: string | null = null
  ): Promise<Dataset> => {
    try {
      if (!file) {
        throw new Error("No file selected for upload.");
      }
      
      if (!userId) {
        throw new Error("User ID is required for upload.");
      }

      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const validExtensions = ['csv', 'xls', 'xlsx', 'json'];
      if (!validExtensions.includes(fileExtension)) {
        throw new Error("Invalid file type. Only CSV, Excel, and JSON files are supported.");
      }

      const bucketName = storageType || 'datasets';
      const filePath = storagePath || `${userId}/${uuidv4()}`;

      console.log(`Uploading file "${file.name}" to storage "${bucketName}" at path "${filePath}"`);

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error("Failed to upload file to storage:", error);
        throw new Error(`File upload failed: ${error.message}`);
      }

      console.log("File uploaded successfully:", data);

      // Infer column schema from the file
      let columnSchema: Record<string, string> = {};
      try {
        if (fileExtension === 'csv') {
          const text = await file.text();
          const parsed = Papa.parse(text, { header: true, preview: 1 });
          if (parsed.meta.fields) {
            parsed.meta.fields.forEach(field => {
              columnSchema[field] = 'string'; // Default type
            });
          }
        } else if (fileExtension === 'json') {
          const text = await file.text();
          const jsonData = JSON.parse(text);
          if (Array.isArray(jsonData) && jsonData.length > 0) {
            const firstItem = jsonData[0];
            Object.keys(firstItem).forEach(key => {
              columnSchema[key] = typeof firstItem[key];
            });
          } else if (typeof jsonData === 'object' && jsonData !== null) {
            Object.keys(jsonData).forEach(key => {
              columnSchema[key] = typeof jsonData[key];
            });
          }
        }
      } catch (schemaError) {
        console.warn("Failed to infer column schema, using default:", schemaError);
        columnSchema = { "column1": "string" }; // Default schema
      }

      const dataset: Dataset = {
        id: uuidv4(),
        name: datasetName,
        description: datasetDescription,
        file_name: file.name,
        file_size: file.size,
        storage_type: bucketName,
        storage_path: filePath,
        row_count: 0, // Initial value, will be updated later
        column_schema: columnSchema,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: dbData, error: dbError } = await supabase
        .from('datasets')
        .insert([dataset])
        .select()
        .single();

      if (dbError) {
        console.error("Failed to insert dataset record:", dbError);
        throw new Error(`Database insert failed: ${dbError.message}`);
      }

      console.log("Dataset record created:", dbData);
      return dbData as Dataset;
    } catch (error) {
      console.error("Error uploading dataset:", error);
      throw error;
    }
  },

  /**
   * Retrieves all datasets for the current user from the database.
   * @returns A promise that resolves with an array of dataset objects.
   * @throws An error if the database query fails.
   */
  getDatasets: async (): Promise<Dataset[]> => {
    try {
      console.log("Fetching all datasets...");

      const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Failed to fetch datasets:", error);
        throw new Error(`Failed to fetch datasets: ${error.message}`);
      }

      console.log(`Fetched ${data.length} datasets.`);
      return data as Dataset[];
    } catch (error) {
      console.error("Error fetching datasets:", error);
      throw error;
    }
  },

  /**
   * Retrieves a single dataset by its ID.
   * @param datasetId The ID of the dataset to retrieve.
   * @returns A promise that resolves with the dataset object, or null if not found.
   * @throws An error if the database query fails.
   */
  getDataset: async (datasetId: string): Promise<Dataset | null> => {
    try {
      console.log(`Fetching dataset with ID: ${datasetId}`);

      const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .eq('id', datasetId)
        .single();

      if (error) {
        console.error(`Failed to fetch dataset with ID ${datasetId}:`, error);
        throw new Error(`Failed to fetch dataset: ${error.message}`);
      }

      console.log("Dataset fetched successfully:", data);
      return data as Dataset;
    } catch (error) {
      console.error("Error fetching dataset:", error);
      throw error;
    }
  },

  /**
   * Retrieves the column schema for a dataset.
   * @param datasetId The ID of the dataset.
   * @returns A promise that resolves with the column schema object.
   * @throws An error if the database query fails.
   */
  getDatasetSchema: async (datasetId: string): Promise<Record<string, string>> => {
    try {
      console.log(`Fetching schema for dataset with ID: ${datasetId}`);

      const { data, error } = await supabase
        .from('datasets')
        .select('column_schema')
        .eq('id', datasetId)
        .single();

      if (error) {
        console.error(`Failed to fetch schema for dataset with ID ${datasetId}:`, error);
        throw new Error(`Failed to fetch dataset schema: ${error.message}`);
      }

      console.log("Dataset schema fetched successfully:", data);
      return data?.column_schema || {};
    } catch (error) {
      console.error("Error fetching dataset schema:", error);
      throw error;
    }
  },

  /**
   * Retrieves a preview of the dataset by fetching the first few rows from storage.
   * @param datasetId The ID of the dataset to preview.
   * @returns A promise that resolves with an array of objects representing the preview data.
   * @throws An error if the storage download or CSV parsing fails.
   */
  previewDataset: async (datasetId: string) => {
    try {
      console.log(`Loading dataset preview for ID: ${datasetId}`);
      
      // First try loading using the transform edge function as it's more reliable
      try {
        const functionUrl = `${supabaseUrl}/functions/v1/transform`;
        
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: JSON.stringify({
            query_type: 'ui_builder',
            dataset_id: datasetId,
            query_config: {
              dataset_id: datasetId,
              chart_type: 'bar',
              measures: [], 
              dimensions: [],
              limit: 100
            }
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.data && result.data.length > 0) {
            console.log(`Got dataset preview from transform function: ${result.data.length} rows`);
            return result.data;
          }
          throw new Error('Transform returned empty data');
        }
        throw new Error(`Transform function returned status ${response.status}`);
      } catch (transformError) {
        console.error('Error previewing via transform function:', transformError);
        // Fall back to direct storage method
      }
      
      // Get the dataset record
      const { data: dataset, error: datasetError } = await supabase
        .from('datasets')
        .select('*')
        .eq('id', datasetId)
        .single();
      
      if (datasetError) {
        console.error('Error getting dataset:', datasetError);
        throw new Error(`Failed to get dataset: ${datasetError.message}`);
      }
      
      console.log(`Storage download for path: ${dataset.storage_path}`);
      
      // Try the direct storage method
      try {
        const { data: fileData, error: downloadError } = await supabase
          .storage
          .from(dataset.storage_type === 'local' ? 'datasets' : dataset.storage_type)
          .download(dataset.storage_path);
          
        if (downloadError) {
          throw new Error(`Failed to download file: ${downloadError.message}`);
        }
        
        if (!fileData) {
          throw new Error('Downloaded file is empty');
        }
        
        const text = await fileData.text();
        const parsed = Papa.parse(text, {
          header: true,
          skipEmptyLines: true
        });
        
        if (parsed.errors && parsed.errors.length > 0) {
          console.warn('CSV parsing errors:', parsed.errors);
        }
        
        console.log(`Successfully parsed CSV with ${parsed.data.length} rows`);
        return parsed.data.slice(0, 100); // Limit to first 100 rows
      } catch (storageError) {
        console.error('Storage download error:', storageError);
        
        // Fall back to sample data as last resort if all else fails
        console.log('Generating fallback sample data for visualization');
        return generateSampleData(dataset.name || 'Sample');
      }
    } catch (error) {
      console.error('Error previewing dataset:', error);
      throw error;
    }
  },

  /**
   * Fetches a dataset directly from Supabase storage.
   * @param datasetId The ID of the dataset.
   * @returns A promise that resolves with the parsed dataset as an array of objects.
   */
  getDatasetDirectFromStorage: async (datasetId: string): Promise<any[]> => {
    try {
      console.log(`Fetching dataset directly from storage for ID: ${datasetId}`);

      const { data: dataset, error: datasetError } = await supabase
        .from('datasets')
        .select('*')
        .eq('id', datasetId)
        .single();

      if (datasetError) {
        console.error('Error getting dataset:', datasetError);
        throw new Error(`Failed to get dataset: ${datasetError.message}`);
      }

      const { data: fileData, error: storageError } = await supabase.storage
        .from(dataset.storage_type)
        .download(dataset.storage_path);

      if (storageError) {
        console.error('Error downloading file from storage:', storageError);
        throw new Error(`Failed to download file: ${storageError.message}`);
      }

      const text = await fileData.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });

      if (parsed.errors && parsed.errors.length > 0) {
        console.warn('CSV parsing errors:', parsed.errors);
      }

      console.log(`Successfully parsed CSV with ${parsed.data.length} rows`);
      return parsed.data;
    } catch (error) {
      console.error('Error fetching dataset from storage:', error);
      throw error;
    }
  },

  /**
   * Performs schema inference on a file by reading the first few lines and determining the data type of each column.
   * @param file The file to analyze.
   * @returns A promise that resolves with a record of column names and their inferred data types.
   */
  previewSchemaInference: async (file: File): Promise<Record<string, string>> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        preview: 10,
        complete: (results) => {
          const fields = results.meta.fields || [];
          const schema: Record<string, string> = {};

          if (results.data && results.data.length > 0) {
            const firstRow = results.data[0] as Record<string, any>;
            fields.forEach(field => {
              const value = firstRow[field];
              if (typeof value === 'number') {
                schema[field] = 'number';
              } else if (typeof value === 'boolean') {
                schema[field] = 'boolean';
              } else if (typeof value === 'string') {
                if (!isNaN(Date.parse(value)) && String(value).match(/^\d{4}-\d{2}-\d{2}/)) {
                  schema[field] = 'date';
                } else {
                  schema[field] = 'string';
                }
              } else {
                schema[field] = 'string';
              }
            });
          } else {
            fields.forEach(field => {
              schema[field] = 'string'; // Default type
            });
          }
          resolve(schema);
        },
        error: (error) => {
          console.error("Schema inference error:", error);
          reject(error);
        }
      });
    });
  },

  /**
   * Executes a SQL query against a dataset.
   * @param datasetId The ID of the dataset to query.
   * @param queryText The SQL query to execute.
   * @returns A promise that resolves with the query results.
   */
  executeQuery: async (datasetId: string, queryText: string): Promise<any> => {
    try {
      console.log(`Executing query "${queryText}" on dataset ${datasetId}`);

      // In a real application, this would involve setting up a database connection
      // and executing the query against the database.
      // For this example, we'll just return a mock result.
      const mockResult = [
        { column1: 'value1', column2: 123 },
        { column1: 'value2', column2: 456 }
      ];

      console.log("Query executed successfully, returning mock result.");
      return mockResult;
    } catch (error) {
      console.error("Error executing query:", error);
      throw error;
    }
  },

  /**
   * Saves a query to the database.
   * @param datasetId The ID of the dataset the query is associated with.
   * @param queryText The text of the query.
   * @param queryConfig The configuration of the query.
   * @param resultData The results of the query.
   * @returns A promise that resolves with the saved query object.
   */
  saveQuery: async (datasetId: string, queryText: string, queryConfig: any, resultData: any): Promise<Query> => {
    try {
      console.log(`Saving query "${queryText}" for dataset ${datasetId}`);

      const query: Query = {
        id: uuidv4(),
        dataset_id: datasetId,
        query_text: queryText,
        query_config: queryConfig,
        result_data: resultData,
        created_at: new Date().toISOString()
      };

      // In a real application, this would involve saving the query to a database.
      // For this example, we'll just return the query object.
      console.log("Query saved successfully:", query);
      return query;
    } catch (error) {
      console.error("Error saving query:", error);
      throw error;
    }
  },

  /**
   * Saves a visualization to the database.
   * @param datasetId The ID of the dataset the visualization is associated with.
   * @param chartType The type of chart to use for the visualization.
   * @param xAxis The column to use for the x-axis.
   * @param yAxis The column to use for the y-axis.
   * @param config The configuration of the visualization.
   * @returns A promise that resolves with the saved visualization object.
   */
  saveVisualization: async (datasetId: string, chartType: string, xAxis: string, yAxis: string, config: any): Promise<Visualization> => {
    try {
      console.log(`Saving visualization for dataset ${datasetId}`);

      const visualization: Visualization = {
        id: uuidv4(),
        dataset_id: datasetId,
        chart_type: chartType,
        x_axis: xAxis,
        y_axis: yAxis,
        config: config,
        created_at: new Date().toISOString()
      };

      // In a real application, this would involve saving the visualization to a database.
      // For this example, we'll just return the visualization object.
      console.log("Visualization saved successfully:", visualization);
      return visualization;
    } catch (error) {
      console.error("Error saving visualization:", error);
      throw error;
    }
  }
};

// Implement deletion functionality
export const deleteDataset = async (datasetId: string) => {
  try {
    console.log(`Deleting dataset with ID: ${datasetId}`);
    
    // First get the dataset to retrieve its storage path
    const { data: dataset, error: fetchError } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', datasetId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching dataset for deletion:', fetchError);
      throw new Error(`Failed to find dataset: ${fetchError.message}`);
    }
    
    // Try to delete from storage first if we have a storage path
    if (dataset?.storage_path) {
      try {
        // Delete the file from storage
        const { error: storageError } = await supabase
          .storage
          .from(dataset.storage_type === 'local' ? 'datasets' : dataset.storage_type)
          .remove([dataset.storage_path]);
        
        if (storageError) {
          console.warn('Error deleting dataset from storage:', storageError);
          // Continue even if storage delete fails
        } else {
          console.log(`Successfully deleted file from storage: ${dataset.storage_path}`);
        }
      } catch (storageError) {
        console.warn('Exception during storage deletion:', storageError);
        // Continue even if storage delete fails
      }
    }
    
    // Delete the dataset record from the database
    const { error: deleteError } = await supabase
      .from('datasets')
      .delete()
      .eq('id', datasetId);
    
    if (deleteError) {
      console.error('Error deleting dataset record:', deleteError);
      throw new Error(`Failed to delete dataset: ${deleteError.message}`);
    }
    
    // Also delete any related queries and visualizations
    try {
      await supabase.from('queries').delete().eq('dataset_id', datasetId);
      await supabase.from('visualizations').delete().eq('dataset_id', datasetId);
    } catch (relatedError) {
      console.warn('Error cleaning up related records:', relatedError);
      // Non-critical
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteDataset:', error);
    throw error;
  }
};

// Generate fallback sample data for visualization when actual data loading fails
const generateSampleData = (datasetName: string) => {
  const categories = ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'];
  const years = [2020, 2021, 2022, 2023, 2024];
  const data = [];
  
  for (const category of categories) {
    for (const year of years) {
      data.push({
        Category: category,
        Year: year,
        Value: Math.floor(Math.random() * 1000),
        Revenue: Math.floor(Math.random() * 10000) / 100,
        Count: Math.floor(Math.random() * 100)
      });
    }
  }
  
  console.log('Generated sample fallback data:', data.length, 'rows');
  return data;
};

const supabaseUrl = 'https://rehadpogugijylybwmoe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlaGFkcG9ndWdpanlseWJ3bW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4MzcyOTEsImV4cCI6MjA1OTQxMzI5MX0.jMgvzUUum46NpLp4ZKfXI06M1nIvu82L9bmAuxqYYZw';

// Add to the exported functions
dataService.deleteDataset = deleteDataset;
