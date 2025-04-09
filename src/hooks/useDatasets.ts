
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/hooks/useAuth';
import { getUniqueDatasetsByFilename } from '@/utils/storageUtils';
import { supabase } from '@/lib/supabase';
import { datasetUtils } from '@/utils/datasetUtils';

export const useDatasets = () => {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [uniqueDatasets, setUniqueDatasets] = useState<any[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const maxRetries = 3;
  
  const { toast: hookToast } = useToast();
  const { isAuthenticated, user } = useAuth();

  const loadDatasets = useCallback(async (forceRefresh = false) => {
    // Don't try to load datasets if already refreshing
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    setIsLoading(true);
    
    try {
      console.log("Fetching all datasets...");
      
      if (forceRefresh) {
        // Clear state before refreshing
        setDatasets([]);
        setUniqueDatasets([]);
      }
      
      const data = await dataService.getDatasets();
      console.log(`Fetched ${data.length} datasets.`);
      
      if (data.length === 0 && retryCount < maxRetries) {
        console.log(`No datasets found, retrying... (${retryCount + 1}/${maxRetries})`);
        setRetryCount(prev => prev + 1);
        
        // Add a reasonable delay before retrying
        setTimeout(() => {
          setIsRefreshing(false);
          loadDatasets();
        }, 1000);
        return;
      }
      
      const filtered = getUniqueDatasetsByFilename(data);
      
      // Update state atomically
      setDatasets(data);
      setUniqueDatasets(filtered);

      // Update selected dataset ID if necessary
      if (filtered.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(filtered[0].id);
      } else if (selectedDatasetId && !filtered.some(d => d.id === selectedDatasetId)) {
        // If selected dataset was deleted, select first available
        setSelectedDatasetId(filtered.length > 0 ? filtered[0].id : null);
      }
      
      console.log(`Loaded datasets: ${filtered.length} unique datasets available`);
      
      // Reset retry counter
      setRetryCount(0);
      
      // Preload dataset content if authenticated
      if (filtered.length > 0 && isAuthenticated) {
        const datasetToPreload = selectedDatasetId || filtered[0].id;
        setTimeout(() => {
          datasetUtils.loadDatasetContent(datasetToPreload, {
            preventSampleFallback: true,
            showToasts: false
          }).catch(err => console.warn("Preloading dataset failed:", err));
        }, 200);
      }
    } catch (error) {
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
        
        // Add increasing delay for retries
        setTimeout(() => {
          setIsRefreshing(false);
          loadDatasets();
        }, 1000 * (retryCount + 1));
      } else {
        showErrorToast();
      }
    } finally {
      setIsLoading(false);
      // Allow a minimum time between refreshes
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  }, [selectedDatasetId, hookToast, retryCount, maxRetries, isAuthenticated, isRefreshing]);

  // Only load datasets once on initial authentication
  useEffect(() => {
    if (isAuthenticated && !isRefreshing) {
      loadDatasets();
    }
  }, [isAuthenticated, loadDatasets, isRefreshing]);
  
  const deleteDataset = useCallback(async (datasetId: string) => {
    if (!datasetId) return false;
    
    try {
      console.log(`Deleting dataset with ID: ${datasetId}`);
      
      // Update local state first for immediate feedback
      setDatasets(prev => prev.filter(d => d.id !== datasetId));
      setUniqueDatasets(prev => prev.filter(d => d.id !== datasetId));
      
      // Update selected dataset if necessary
      if (selectedDatasetId === datasetId) {
        const remainingDatasets = datasets.filter(d => d.id !== datasetId);
        if (remainingDatasets.length > 0) {
          setSelectedDatasetId(remainingDatasets[0].id);
        } else {
          setSelectedDatasetId(null);
        }
      }
      
      // Clear cache for this dataset
      try {
        sessionStorage.removeItem(`dataset_${datasetId}`);
        console.log(`Cleared dataset cache for ${datasetId}`);
      } catch (e) {
        console.warn("Could not clear dataset cache:", e);
      }
      
      // Delegate actual deletion to dataService
      const success = await dataService.deleteDataset(datasetId);
      
      if (!success) {
        toast.error('Failed to delete dataset');
        
        // Restore state and reload data
        setTimeout(() => loadDatasets(true), 500);
        return false;
      }
      
      toast.success('Dataset deleted successfully');
      
      // Refresh dataset list, but not immediately to avoid UI flicker
      setTimeout(() => {
        loadDatasets(true);
      }, 1000);
      
      return true;
    } catch (error) {
      console.error('Error in deleteDataset:', error);
      toast.error('Error deleting dataset', { 
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      
      // Restore state and reload data
      setTimeout(() => loadDatasets(true), 500);
      return false;
    }
  }, [selectedDatasetId, datasets, loadDatasets]);
  
  // Set up event listeners for external dataset changes
  useEffect(() => {
    const handleDatasetDeleted = (event: any) => {
      console.log('Dataset deleted event received:', event.detail?.datasetId);
      
      if (!event.detail?.datasetId) return;
      
      // Update local state for immediate feedback
      setDatasets(prevDatasets => 
        prevDatasets.filter(dataset => dataset.id !== event.detail.datasetId)
      );
      
      setUniqueDatasets(prevDatasets => 
        prevDatasets.filter(dataset => dataset.id !== event.detail.datasetId)
      );
      
      // Update selected dataset if necessary
      if (event.detail.datasetId === selectedDatasetId) {
        const remainingDatasets = datasets.filter(d => d.id !== event.detail.datasetId);
        setSelectedDatasetId(remainingDatasets.length > 0 ? remainingDatasets[0].id : null);
      }
      
      // Debounce full refresh to avoid UI flicker
      setTimeout(() => {
        if (!isRefreshing) {
          loadDatasets(true);
        }
      }, 1000);
    };
    
    const handleDatasetUploaded = () => {
      console.log('Dataset uploaded event received');
      
      // Debounce refresh to avoid UI flicker
      setTimeout(() => {
        if (!isRefreshing) {
          loadDatasets(true);
        }
      }, 500);
    };
    
    // Set up event listeners
    window.addEventListener('dataset-deleted', handleDatasetDeleted);
    window.addEventListener('dataset-upload-success', handleDatasetUploaded);
    window.addEventListener('upload:success', handleDatasetUploaded);
    
    return () => {
      // Clean up event listeners
      window.removeEventListener('dataset-deleted', handleDatasetDeleted);
      window.removeEventListener('dataset-upload-success', handleDatasetUploaded);
      window.removeEventListener('upload:success', handleDatasetUploaded);
    };
  }, [selectedDatasetId, loadDatasets, datasets, isRefreshing]);

  const forceRefresh = useCallback(() => {
    console.log("Force refreshing datasets...");
    if (!isRefreshing) {
      setRetryCount(0);
      loadDatasets(true);
    }
  }, [loadDatasets, isRefreshing]);

  return {
    datasets: uniqueDatasets, 
    allDatasets: datasets, 
    selectedDatasetId,
    setSelectedDatasetId,
    isLoading,
    loadDatasets,
    forceRefresh,
    deleteDataset,
    isRefreshing
  };
};
