import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [hasError, setHasError] = useState(false);
  const [emptyStateConfirmed, setEmptyStateConfirmed] = useState(false);
  const fetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDoneRef = useRef(false);
  const dataRefreshTimestampRef = useRef<number>(Date.now());
  const maxRetries = 2;
  const minTimeBetweenRefreshes = 15000; // 15 seconds minimum between auto refreshes
  
  const { toast: hookToast } = useToast();
  const { isAuthenticated, user } = useAuth();

  const clearFetchTimer = () => {
    if (fetchTimerRef.current) {
      clearTimeout(fetchTimerRef.current);
      fetchTimerRef.current = null;
    }
  };

  const loadDatasets = useCallback(async (forceRefresh = false) => {
    // Don't try to load datasets if already refreshing
    if (isRefreshing) return;
    
    // Don't retry if we've confirmed there are no datasets (unless forced)
    if (emptyStateConfirmed && !forceRefresh) {
      setIsLoading(false);
      return;
    }
    
    // Prevent excessive refreshing by enforcing minimum time between refreshes
    const currentTime = Date.now();
    if (!forceRefresh && currentTime - dataRefreshTimestampRef.current < minTimeBetweenRefreshes) {
      console.log("Skipping refresh, too soon since last refresh");
      return;
    }
    
    // Clear any existing fetch timer
    clearFetchTimer();
    
    setIsRefreshing(true);
    
    // Only set loading on first load or forced refresh to prevent UI flickering
    if (!initialLoadDoneRef.current || forceRefresh) {
      setIsLoading(true);
    }
    
    try {
      console.log("Fetching all datasets...");
      dataRefreshTimestampRef.current = Date.now();
      
      if (forceRefresh) {
        // Clear state before refreshing
        setDatasets([]);
        setUniqueDatasets([]);
        setEmptyStateConfirmed(false);
      }
      
      const data = await dataService.getDatasets();
      console.log(`Fetched ${data.length} datasets.`);
      
      // If there are no datasets after initial load or max retries, mark as confirmed empty state
      if (data.length === 0) {
        if (initialLoadDoneRef.current || retryCount >= maxRetries - 1) {
          console.log("No datasets found after retries, marking empty state as confirmed");
          setEmptyStateConfirmed(true);
        }
        
        if (retryCount < maxRetries && !initialLoadDoneRef.current) {
          console.log(`No datasets found, retrying... (${retryCount + 1}/${maxRetries})`);
          setRetryCount(prev => prev + 1);
          
          // Add a reasonable delay before retrying
          fetchTimerRef.current = setTimeout(() => {
            setIsRefreshing(false);
            loadDatasets();
          }, 5000); // Increased delay to reduce fetch frequency
          return;
        }
      } else {
        // If we found datasets, reset empty state flag
        setEmptyStateConfirmed(false);
      }
      
      const filtered = getUniqueDatasetsByFilename(data);
      
      // Update state atomically
      setDatasets(data);
      setUniqueDatasets(filtered);
      setHasError(false);

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
      
      // Preload dataset content if authenticated - but don't do this automatically
      // to reduce unnecessary network traffic
      if (filtered.length > 0 && isAuthenticated && forceRefresh) {
        const datasetToPreload = selectedDatasetId || filtered[0].id;
        fetchTimerRef.current = setTimeout(() => {
          datasetUtils.loadDatasetContent(datasetToPreload, {
            preventSampleFallback: true,
            showToasts: false
          }).catch(err => console.warn("Preloading dataset failed:", err));
        }, 2000);
      }
    } catch (error) {
      const showErrorToast = () => {
        setHasError(true);
        
        // Show toast error only once, not repeatedly
        if (retryCount === 0) {
          try {
            hookToast({
              title: 'Error loading datasets',
              description: 'Network connection issue. Will retry automatically.',
              variant: 'destructive'
            });
          } catch (toastError) {
            toast.error('Error loading datasets', {
              description: 'Network connection issue. Will retry automatically.'
            });
          }
        }
      };
      
      if (retryCount < maxRetries && !initialLoadDoneRef.current) {
        console.log(`Error loading datasets, retrying... (${retryCount + 1}/${maxRetries})`);
        setRetryCount(prev => prev + 1);
        
        // Add increasing delay for retries
        fetchTimerRef.current = setTimeout(() => {
          setIsRefreshing(false);
          loadDatasets();
        }, 5000 * (retryCount + 1)); // Longer delay between retries
        
        if (retryCount === 1) {
          showErrorToast();
        }
      } else {
        showErrorToast();
        // After max retries, set a longer timeout before trying again and mark as confirmed empty
        setEmptyStateConfirmed(true);
        fetchTimerRef.current = setTimeout(() => {
          setRetryCount(0);
          setIsRefreshing(false);
          setEmptyStateConfirmed(false); // Reset for next try
          loadDatasets();
        }, 60000); // 60 seconds before trying again after max retries
      }
    } finally {
      initialLoadDoneRef.current = true;
      setIsLoading(false);
      // Allow a minimum time between refreshes
      setTimeout(() => {
        setIsRefreshing(false);
      }, 2000);
    }
  }, [selectedDatasetId, hookToast, retryCount, maxRetries, isAuthenticated, isRefreshing, emptyStateConfirmed]);

  // Clean up timers when component unmounts
  useEffect(() => {
    return () => {
      clearFetchTimer();
    };
  }, []);

  // Only load datasets once on initial authentication
  useEffect(() => {
    if (isAuthenticated && !isRefreshing && !initialLoadDoneRef.current) {
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
        fetchTimerRef.current = setTimeout(() => loadDatasets(true), 1000);
        return false;
      }
      
      toast.success('Dataset deleted successfully');
      
      // Refresh dataset list, but not immediately to avoid UI flicker
      fetchTimerRef.current = setTimeout(() => {
        loadDatasets(true);
      }, 1500);
      
      return true;
    } catch (error) {
      console.error('Error in deleteDataset:', error);
      toast.error('Error deleting dataset', { 
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      
      // Restore state and reload data
      fetchTimerRef.current = setTimeout(() => loadDatasets(true), 1000);
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
      clearFetchTimer();
      fetchTimerRef.current = setTimeout(() => {
        if (!isRefreshing) {
          loadDatasets(true);
        }
      }, 2000);
    };
    
    const handleDatasetUploaded = () => {
      console.log('Dataset uploaded event received');
      
      // Debounce refresh to avoid UI flicker
      clearFetchTimer();
      fetchTimerRef.current = setTimeout(() => {
        if (!isRefreshing) {
          loadDatasets(true);
        }
      }, 1500);
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
      clearFetchTimer();
    };
  }, [selectedDatasetId, loadDatasets, datasets, isRefreshing]);

  const forceRefresh = useCallback(() => {
    console.log("Force refreshing datasets...");
    if (!isRefreshing) {
      clearFetchTimer();
      setRetryCount(0);
      setEmptyStateConfirmed(false);
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
    isRefreshing,
    hasError,
    emptyStateConfirmed
  };
};
