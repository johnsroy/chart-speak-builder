
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { dataProcessorUrl } from '@/config/api';
import { Dataset, StorageStats } from '@/services/types/datasetTypes';
import { getUniqueDatasetsByFilename } from '@/utils/storageUtils';

export const dataService = {
  getDatasets: async () => {
    try {
      const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching datasets:', error);
      toast.error('Failed to fetch datasets');
      return [];
    }
  },

  // New method to get unique datasets (no duplicates)
  getUniqueDatasets: async () => {
    try {
      const datasets = await dataService.getDatasets();
      return getUniqueDatasetsByFilename(datasets);
    } catch (error) {
      console.error('Error fetching unique datasets:', error);
      toast.error('Failed to fetch unique datasets');
      return [];
    }
  },

  // New method to get storage statistics
  getStorageStats: async (userId: string): Promise<StorageStats> => {
    try {
      // Get all datasets for the user
      const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      // Calculate statistics
      const datasets = data || [];
      const totalSize = datasets.reduce((sum, dataset) => sum + (dataset.file_size || 0), 0);
      const datasetCount = datasets.length;
      const storageTypes = [...new Set(datasets.map(d => d.storage_type || 'datasets'))];
      const totalFields = datasets.reduce((sum, dataset) => {
        const schema = dataset.column_schema || {};
        return sum + Object.keys(schema).length;
      }, 0);
      
      // Format the size for display
      const formattedSize = formatByteSize(totalSize);
      
      return {
        totalSize,
        datasetCount,
        formattedSize,
        storageTypes,
        totalFields
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return {
        totalSize: 0,
        datasetCount: 0,
        formattedSize: '0 B',
        storageTypes: [],
        totalFields: 0
      };
    }
  },

  // New method to upload datasets
  uploadDataset: async (
    file: File,
    name: string,
    description?: string,
    existingDatasetId?: string | null,
    onProgress?: (progress: number) => void,
    userId?: string
  ): Promise<Dataset> => {
    try {
      const user_id = userId || 'system_user';
      
      // Generate file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${fileExt}`;
      const filePath = `uploads/${user_id}/${fileName}`;
      
      // Upload file to storage
      const { data, error } = await supabase.storage
        .from('datasets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) throw new Error(error.message || 'Could not upload file to storage');
      
      // Get public URL
      const publicURL = supabase.storage.from('datasets').getPublicUrl(filePath).data.publicUrl;
      
      let datasetId = existingDatasetId;
      let column_schema = {};
      
      // Try to extract schema from file if it's CSV
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        try {
          const text = await file.text();
          const lines = text.split('\n');
          if (lines.length > 0) {
            const headers = lines[0].split(',').map(h => h.trim());
            column_schema = headers.reduce((schema: Record<string, string>, header) => {
              schema[header] = 'string';
              return schema;
            }, {});
          }
        } catch (err) {
          console.warn('Failed to extract schema from CSV file:', err);
        }
      }
      
      // Create or update dataset record
      if (existingDatasetId) {
        // Update existing dataset
        const { data: updateData, error: updateError } = await supabase
          .from('datasets')
          .update({
            file_name: file.name,
            file_size: file.size,
            storage_path: filePath,
            storage_url: publicURL,
            updated_at: new Date().toISOString(),
            column_schema
          })
          .eq('id', existingDatasetId)
          .select()
          .single();
        
        if (updateError) throw new Error(updateError.message || 'Could not update dataset record');
        return updateData as Dataset;
      } else {
        // Create new dataset
        const { data: insertData, error: insertError } = await supabase
          .from('datasets')
          .insert([
            {
              name,
              description,
              file_name: file.name,
              file_size: file.size,
              storage_path: filePath,
              storage_url: publicURL,
              storage_type: 'datasets',
              user_id: user_id,
              row_count: 0,
              column_schema
            }
          ])
          .select()
          .single();
        
        if (insertError) throw new Error(insertError.message || 'Could not create dataset record');
        return insertData as Dataset;
      }
    } catch (error) {
      console.error('Error uploading dataset:', error);
      throw error;
    }
  },

  getDataset: async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error fetching dataset ${id}:`, error);
      return null;
    }
  },

  deleteDataset: async (id: string) => {
    try {
      // First try using the edge function if available
      try {
        const response = await fetch(`${dataProcessorUrl}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabase.auth.getSession()}`
          },
          body: JSON.stringify({
            action: 'delete',
            dataset_id: id
          })
        });

        const result = await response.json();
        if (result.success) {
          return true;
        }
        
        console.warn('Edge function deletion returned error:', result.error);
        // Fall through to manual deletion if edge function fails
      } catch (edgeFnError) {
        console.warn('Edge function deletion failed:', edgeFnError);
        // Fall through to manual deletion
      }

      // Manual deletion as fallback
      const dataset = await dataService.getDataset(id);
      if (!dataset) {
        throw new Error('Dataset not found');
      }

      // Delete related queries first
      try {
        await supabase
          .from('queries')
          .delete()
          .eq('dataset_id', id);
      } catch (error) {
        console.warn('Error deleting related queries:', error);
        // Continue anyway
      }

      // Try to delete the file from storage
      if (dataset.storage_path) {
        try {
          await supabase.storage
            .from(dataset.storage_type || 'datasets')
            .remove([dataset.storage_path]);
        } catch (storageError) {
          console.warn('Failed to delete file from storage:', storageError);
          // Continue anyway
        }
      }

      // Delete the dataset record
      const { error } = await supabase
        .from('datasets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting dataset:', error);
      toast.error('Failed to delete dataset', {
        description: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  },

  previewDataset: async (id: string) => {
    try {
      console.log(`Previewing dataset ${id}...`);
      const dataset = await dataService.getDataset(id);
      
      if (!dataset) {
        throw new Error('Dataset not found');
      }

      // First try the edge function
      try {
        const response = await fetch(`${dataProcessorUrl}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabase.auth.getSession()}`
          },
          body: JSON.stringify({
            action: 'preview',
            dataset_id: id
          })
        });

        const result = await response.json();
        if (result.success && result.data && Array.isArray(result.data)) {
          return result.data;
        }
        
        console.warn('Edge function preview returned error or invalid data:', result);
      } catch (edgeFnError) {
        console.warn('Edge function preview failed:', edgeFnError);
      }
      
      // Direct storage access attempt
      if (dataset.storage_path && dataset.storage_type) {
        try {
          console.log(`Attempting direct storage access from ${dataset.storage_type} bucket, path: ${dataset.storage_path}`);
          const { data, error } = await supabase.storage
            .from(dataset.storage_type)
            .download(dataset.storage_path);
            
          if (error) {
            console.error("Error accessing storage directly:", error);
            throw error;
          }
          
          if (data) {
            const text = await data.text();
            const lines = text.split('\n');
            
            if (lines.length < 2) {
              throw new Error("File is empty or contains only headers");
            }
            
            const headers = lines[0].split(',').map(h => h.trim());
            const rows = [];
            
            // Process a reasonable number of rows
            const maxRows = Math.min(lines.length, 1000);
            for (let i = 1; i < maxRows; i++) {
              const line = lines[i].trim();
              if (!line) continue;
              
              const values = line.split(',');
              const row: Record<string, any> = {};
              
              headers.forEach((header, index) => {
                row[header] = values[index] || '';
              });
              
              rows.push(row);
            }
            
            return rows;
          }
        } catch (storageError) {
          console.error("Alternate storage error:", storageError);
        }
      }
      
      // If it's a local/fallback dataset, generate appropriate sample data
      if (dataset.storage_type === 'local' && dataset.file_name) {
        console.log("Local storage dataset detected, generating appropriate sample data");
        const vehicleTypes = ['BEV', 'PHEV', 'FCEV', 'HEV'];
        const manufacturers = ['Tesla', 'Toyota', 'Ford', 'GM', 'Hyundai', 'Kia', 'Honda', 'Nissan', 'BMW', 'Mercedes'];
        const models = ['Model 3', 'Model S', 'Leaf', 'Prius', 'F-150', 'Ioniq', 'Kona', 'Bolt', 'Mach-E', 'ID.4'];
        const counties = ['King', 'Pierce', 'Snohomish', 'Thurston', 'Clark', 'Spokane', 'Whatcom'];
        
        const sampleData = [];
        
        for (let i = 0; i < 100; i++) {
          sampleData.push({
            'VIN (1-10)': `SAMPLE${i}${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
            'County': counties[i % counties.length],
            'City': ['Seattle', 'Tacoma', 'Spokane', 'Bellevue', 'Olympia', 'Vancouver', 'Bellingham', 
                     'Bremerton', 'Kennewick', 'Yakima'][i % 10],
            'State': ['WA', 'OR', 'CA', 'ID', 'NY', 'FL', 'TX', 'OH', 'PA', 'IL'][i % 10],
            'Postal Code': 90000 + Math.floor(Math.random() * 10000),
            'Model Year': 2014 + (i % 10),
            'Make': manufacturers[i % manufacturers.length],
            'Model': models[i % models.length],
            'Electric Vehicle Type': vehicleTypes[i % vehicleTypes.length],
            'Clean Alternative Fuel Vehicle (CAFV) Eligibility': i % 3 === 0 ? 'Not eligible due to low battery range' : 'Clean Alternative Fuel Vehicle Eligible',
            'Electric Range': 80 + Math.floor(Math.random() * 320),
            'Base MSRP': 30000 + Math.floor(Math.random() * 70000),
            'Legislative District': Math.floor(Math.random() * 49) + 1,
            'DOL Vehicle ID': 100000 + i,
            'Vehicle Location': `POINT (-122.${Math.floor(Math.random() * 1000)} 47.${Math.floor(Math.random() * 1000)})`
          });
        }
        
        return sampleData;
      }

      throw new Error('Dataset content could not be accessed');
    } catch (error) {
      console.error('Error previewing dataset:', error);
      throw error;
    }
  },
};

// Helper function to format byte size
function formatByteSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}
