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
  const maxRetries = 3;
  
  const { toast: hookToast } = useToast();
  const { isAuthenticated, user } = useAuth();

  const loadDatasets = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      console.log("Fetching all datasets...");
      
      // Clear any cached state if force refreshing
      if (forceRefresh) {
        setDatasets([]);
        setUniqueDatasets([]);
      }
      
      const data = await dataService.getDatasets();
      console.log(`Fetched ${data.length} datasets.`);
      
      if (data.length === 0 && retryCount < maxRetries) {
        console.log(`No datasets found, retrying... (${retryCount + 1}/${maxRetries})`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => loadDatasets(), 1000);
        return;
      }
      
      const filtered = getUniqueDatasetsByFilename(data);
      
      setDatasets(data);
      setUniqueDatasets(filtered);

      if (filtered.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(filtered[0].id);
      } else if (selectedDatasetId && !filtered.find(d => d.id === selectedDatasetId)) {
        setSelectedDatasetId(filtered.length > 0 ? filtered[0].id : null);
      }
      
      console.log(`Loaded datasets: ${filtered.length} unique datasets available`);
      
      setRetryCount(0);
      
      if (filtered.length > 0 && isAuthenticated) {
        const datasetToPreload = selectedDatasetId || filtered[0].id;
        setTimeout(() => {
          datasetUtils.loadDatasetContent(datasetToPreload, {
            preventSampleFallback: true,
            showToasts: false
          }).catch(err => console.warn("Preloading dataset failed:", err));
        }, 100);
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
        setTimeout(() => loadDatasets(), 1000 * (retryCount + 1));
      } else {
        showErrorToast();
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedDatasetId, hookToast, retryCount, maxRetries, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadDatasets();
    }
  }, [isAuthenticated, loadDatasets]);
  
  const deleteDataset = useCallback(async (datasetId: string) => {
    if (!datasetId) return false;
    
    try {
      console.log(`Deleting dataset with ID: ${datasetId}`);
      
      // First remove from local state to update the UI immediately
      setDatasets(prev => prev.filter(d => d.id !== datasetId));
      setUniqueDatasets(prev => prev.filter(d => d.id !== datasetId));
      
      // If the deleted dataset was selected, select another one
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
      } catch (e) {
        console.warn("Could not clear dataset cache:", e);
      }

      // Step 1: Get all queries related to this dataset
      const { data: queries, error: queriesError } = await supabase
        .from('queries')
        .select('id')
        .eq('dataset_id', datasetId);
        
      if (queriesError) {
        console.warn("Error fetching queries for cleanup:", queriesError);
      } else if (queries && queries.length > 0) {
        const queryIds = queries.map(q => q.id);
        console.log(`Found ${queryIds.length} queries to clean up for dataset ${datasetId}`);
        
        // Step 2: Delete all visualizations for these queries first
        if (queryIds.length > 0) {
          const { error: vizError } = await supabase
            .from('visualizations')
            .delete()
            .in('query_id', queryIds);
            
          if (vizError) {
            console.warn("Error deleting related visualizations:", vizError);
          } else {
            console.log(`Successfully deleted visualizations related to dataset ${datasetId}`);
          }
          
          // Wait to ensure database processes deletion
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Step 3: Delete all queries for this dataset
      const { error: deleteQueriesError } = await supabase
        .from('queries')
        .delete()
        .eq('dataset_id', datasetId);
      
      if (deleteQueriesError) {
        console.warn("Error deleting queries:", deleteQueriesError);
      } else {
        console.log(`Successfully deleted all queries for dataset ${datasetId}`);
      }
      
      // Wait to ensure database processes deletion
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Step 4: Verify queries are gone
      const { count, error: countError } = await supabase
        .from('queries')
        .select('*', { count: 'exact', head: true })
        .eq('dataset_id', datasetId);
        
      if (countError) {
        console.warn("Error checking if queries exist:", countError);
      } else if (count && count > 0) {
        console.warn(`WARNING: ${count} queries still exist for dataset ${datasetId}`);
        toast.error(`Could not delete all queries for this dataset. Please try again.`);
        return false;
      }
      
      // Step 5: Execute actual deletion through the dataService
      const success = await dataService.deleteDataset(datasetId);
      
      if (!success) {
        toast.error('Failed to delete dataset');
        // Reload data to restore state if deletion failed
        loadDatasets(true);
        return false;
      }
      
      toast.success('Dataset deleted successfully');
      
      // Fully refresh the dataset list
      setTimeout(() => {
        loadDatasets(true);
      }, 500);
      
      return true;
    } catch (error) {
      console.error('Error in deleteDataset:', error);
      toast.error('Error deleting dataset', { 
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
      // Reload data to restore state if deletion failed
      loadDatasets(true);
      return false;
    }
  }, [selectedDatasetId, datasets, loadDatasets]);
  
  useEffect(() => {
    const handleDatasetDeleted = (event: any) => {
      console.log('Dataset deleted event received:', event.detail?.datasetId);
      
      if (!event.detail?.datasetId) return;
      
      // Remove the deleted dataset from state
      setDatasets(prevDatasets => 
        prevDatasets.filter(dataset => dataset.id !== event.detail.datasetId)
      );
      
      setUniqueDatasets(prevDatasets => 
        prevDatasets.filter(dataset => dataset.id !== event.detail.datasetId)
      );
      
      // If the deleted dataset was selected, select another one
      if (event.detail.datasetId === selectedDatasetId) {
        const remainingDatasets = datasets.filter(d => d.id !== event.detail.datasetId);
        setSelectedDatasetId(remainingDatasets.length > 0 ? remainingDatasets[0].id : null);
      }
      
      // Fully refresh the dataset list
      loadDatasets(true);
    };
    
    const handleDatasetUploaded = () => {
      console.log('Dataset uploaded event received');
      loadDatasets(true);
    };
    
    window.addEventListener('dataset-deleted', handleDatasetDeleted);
    window.addEventListener('dataset-upload-success', handleDatasetUploaded);
    window.addEventListener('upload:success', handleDatasetUploaded);
    
    return () => {
      window.removeEventListener('dataset-deleted', handleDatasetDeleted);
      window.removeEventListener('dataset-upload-success', handleDatasetUploaded);
      window.removeEventListener('upload:success', handleDatasetUploaded);
    };
  }, [selectedDatasetId, loadDatasets, datasets]);

  const forceRefresh = useCallback(() => {
    console.log("Force refreshing datasets...");
    setRetryCount(0);
    loadDatasets(true);
  }, [loadDatasets]);

  return {
    datasets: uniqueDatasets, 
    allDatasets: datasets, 
    selectedDatasetId,
    setSelectedDatasetId,
    isLoading,
    loadDatasets,
    forceRefresh,
    deleteDataset
  };
};
