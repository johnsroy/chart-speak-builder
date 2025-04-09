
import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/hooks/useAuth';
import { getUniqueDatasetsByFilename } from '@/utils/storageUtils';

export const useDatasets = () => {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [uniqueDatasets, setUniqueDatasets] = useState<any[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Extract loadDatasets as a useCallback to prevent recreation on each render
  const loadDatasets = useCallback(async () => {
    setIsLoading(true);
    try {
      // Get all datasets
      const data = await dataService.getDatasets();
      
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
    } catch (error) {
      console.error('Error loading datasets:', error);
      toast({
        title: 'Error loading datasets',
        description: error instanceof Error ? error.message : 'Failed to load datasets',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedDatasetId, toast]);

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
      // This ensures the state is fully consistent with the backend
      loadDatasets();
    };
    
    const handleDatasetUploaded = (event: any) => {
      console.log('Dataset uploaded event received');
      loadDatasets();
      
      // If there's a datasetId in the event, select it
      if (event.detail?.datasetId) {
        setSelectedDatasetId(event.detail.datasetId);
      }
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

  return {
    datasets: uniqueDatasets, // Return only unique datasets by default
    allDatasets: datasets, // Keep all datasets accessible if needed
    selectedDatasetId,
    setSelectedDatasetId,
    isLoading,
    loadDatasets
  };
};
