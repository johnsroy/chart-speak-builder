
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/hooks/useAuth';
import { getUniqueDatasetsByFilename } from '@/utils/storageUtils';

export const useDatasets = () => {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [uniqueDatasets, setUniqueDatasets] = useState<any[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  
  const { toast: hookToast } = useToast();
  const { isAuthenticated, user } = useAuth();

  // Extract loadDatasets as a useCallback to prevent recreation on each render
  const loadDatasets = useCallback(async () => {
    setIsLoading(true);
    try {
      console.log("Fetching all datasets...");
      
      // Get all datasets
      const data = await dataService.getDatasets();
      console.log(`Fetched ${data.length} datasets.`);
      
      if (data.length === 0 && retryCount < maxRetries) {
        // If no datasets were found, increment retry count and try again after a delay
        console.log(`No datasets found, retrying... (${retryCount + 1}/${maxRetries})`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => loadDatasets(), 1000);
        return;
      }
      
      // Get unique datasets (latest version of each file)
      const filtered = getUniqueDatasetsByFilename(data);
      
      setDatasets(data);
      setUniqueDatasets(filtered);

      // Select the first dataset by default if available and none is selected
      if (filtered.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(filtered[0].id);
      } else if (selectedDatasetId && !filtered.find(d => d.id === selectedDatasetId)) {
        // If the currently selected dataset was deleted, select the first one
        setSelectedDatasetId(filtered.length > 0 ? filtered[0].id : null);
      }
      
      console.log(`Loaded datasets: ${filtered.length} unique datasets available`);
      
      // Reset retry count on success
      setRetryCount(0);
    } catch (error) {
      console.error('Error loading datasets:', error);
      
      // Show toast from either hook or direct toast
      const showErrorToast = () => {
        try {
          hookToast({
            title: 'Error loading datasets',
            description: error instanceof Error ? error.message : 'Failed to load datasets',
            variant: 'destructive'
          });
        } catch (toastError) {
          toast.error('Error loading datasets', {
            description: error instanceof Error ? error.message : 'Failed to load datasets'
          });
        }
      };
      
      if (retryCount < maxRetries) {
        console.log(`Error loading datasets, retrying... (${retryCount + 1}/${maxRetries})`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => loadDatasets(), 1000 * (retryCount + 1));
      } else {
        showErrorToast();
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedDatasetId, hookToast, retryCount, maxRetries]);

  useEffect(() => {
    if (isAuthenticated) {
      loadDatasets();
    }
  }, [isAuthenticated, loadDatasets]);
  
  // Listen for dataset events
  useEffect(() => {
    const handleDatasetDeleted = (event: any) => {
      console.log('Dataset deleted event received:', event.detail?.datasetId);
      
      // If the deleted dataset was selected, reset selection
      if (event.detail?.datasetId && event.detail.datasetId === selectedDatasetId) {
        setSelectedDatasetId(null);
      }
      
      // Immediately update the UI by removing the deleted dataset
      setDatasets(prevDatasets => 
        prevDatasets.filter(dataset => dataset.id !== event.detail?.datasetId)
      );
      
      setUniqueDatasets(prevDatasets => 
        prevDatasets.filter(dataset => dataset.id !== event.detail?.datasetId)
      );
      
      // Also reload datasets to ensure we have the latest data
      loadDatasets();
    };
    
    const handleDatasetUploaded = () => {
      console.log('Dataset uploaded event received');
      loadDatasets();
    };
    
    // Add event listeners
    window.addEventListener('dataset-deleted', handleDatasetDeleted);
    window.addEventListener('dataset-upload-success', handleDatasetUploaded);
    window.addEventListener('upload:success', handleDatasetUploaded);
    
    // Clean up
    return () => {
      window.removeEventListener('dataset-deleted', handleDatasetDeleted);
      window.removeEventListener('dataset-upload-success', handleDatasetUploaded);
      window.removeEventListener('upload:success', handleDatasetUploaded);
    };
  }, [selectedDatasetId, loadDatasets]);

  // Force refresh method for external components
  const forceRefresh = useCallback(() => {
    console.log("Force refreshing datasets...");
    setRetryCount(0);
    loadDatasets();
  }, [loadDatasets]);

  return {
    datasets: uniqueDatasets, // Return only unique datasets by default
    allDatasets: datasets, // Keep all datasets accessible if needed
    selectedDatasetId,
    setSelectedDatasetId,
    isLoading,
    loadDatasets,
    forceRefresh
  };
};
