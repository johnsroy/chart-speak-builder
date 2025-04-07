import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from "sonner";
import { dataService } from '@/services/dataService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { 
  validateFileForUpload, 
  validateUserId, 
  simulateProgress, 
  performUpload,
  getDatasetNameFromFile 
} from '@/utils/uploadUtils';
import { verifyStorageBuckets, setupStorageBuckets } from '@/utils/storageUtils';

/**
 * Custom hook for managing file uploads
 */
export const useFileUpload = () => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState('');
  const [datasetDescription, setDatasetDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [schemaPreview, setSchemaPreview] = useState<Record<string, string> | null>(null);
  const [uploadedDatasetId, setUploadedDatasetId] = useState<string | null>(null);
  const [showVisualizeAfterUpload, setShowVisualizeAfterUpload] = useState(false);
  const [showRedirectDialog, setShowRedirectDialog] = useState(false);
  const [existingDatasets, setExistingDatasets] = useState<any[]>([]);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [datasetToOverwrite, setDatasetToOverwrite] = useState<string | null>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, session } = useAuth();

  /**
   * Handles drag events for the file upload area
   */
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  /**
   * Handles file drop events
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileSelection(file);
    }
  };

  /**
   * Handles file input selection
   */
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFileSelection(file);
    }
  };

  /**
   * Processes a selected file
   */
  const handleFileSelection = async (file: File) => {
    try {
      validateFileForUpload(file);
      
      setSelectedFile(file);
      setDatasetName(getDatasetNameFromFile(file));
      setUploadError(null);
      
      // Check for existing datasets with same filename
      const datasets = await dataService.getDatasets();
      setExistingDatasets(datasets);
      
      const existingWithSameName = datasets.find(d => d.file_name === file.name);
      if (existingWithSameName) {
        toast({
          title: "File already exists",
          description: "A file with the same name already exists. You can upload it with a new name or overwrite the existing file.",
          variant: "warning"
        });
        
        // Show overwrite confirmation immediately
        setDatasetToOverwrite(existingWithSameName.id);
        setShowOverwriteConfirm(true);
      }
      
      previewSchemaInference(file);
      
      toast({
        title: "File received",
        description: `Selected: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      toast({
        title: "File selection error",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  /**
   * Generates a schema preview for CSV files
   */
  const previewSchemaInference = async (file: File) => {
    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (file.type === 'text/csv' || fileExtension === 'csv') {
        const schemaSample = await dataService.previewSchemaInference(file);
        setSchemaPreview(schemaSample);
      } else {
        setSchemaPreview(null);
      }
    } catch (error) {
      console.error('Error previewing schema:', error);
      setSchemaPreview(null);
    }
  };

  /**
   * Initiates file upload process with improved error handling and overwrite confirmation
   */
  const handleUpload = async (isAuthenticated: boolean, userId: string) => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }
    
    if (!datasetName.trim()) {
      toast({
        title: "Dataset name required",
        description: "Please provide a name for your dataset",
        variant: "destructive"
      });
      return;
    }

    // Check if file with same name exists and prompt for overwrite
    const duplicateDataset = existingDatasets.find(dataset => dataset.file_name === selectedFile.name);
    if (duplicateDataset) {
      setDatasetToOverwrite(duplicateDataset.id);
      setShowOverwriteConfirm(true);
      return;
    }

    try {
      // Always use a valid user ID to guarantee upload works
      const validatedUserId = validateUserId(userId);
      
      // Start upload process
      setIsUploading(true);
      setUploadError(null);
      const progressInterval = simulateProgress(0, selectedFile.size, setUploadProgress);
      
      try {
        console.log("Starting upload for user:", validatedUserId);
        
        const dataset = await performUpload(
          selectedFile,
          datasetName,
          datasetDescription || undefined,
          validatedUserId,
          setUploadProgress
        );
        
        // Update state with upload results
        setUploadedDatasetId(dataset.id);
        setShowVisualizeAfterUpload(true);
        
        // Reset form
        setSelectedFile(null);
        setDatasetName('');
        setDatasetDescription('');
        setSchemaPreview(null);
        
        // Show redirect dialog
        setShowRedirectDialog(true);
        
        // Show success toast
        sonnerToast.success("Upload complete!", {
          description: "Your dataset was successfully uploaded.",
          action: {
            label: "View Dataset",
            onClick: () => window.location.href = `/visualize/${dataset.id}`,
          },
        });
        
        // Dispatch a custom event for upload success that other components can listen for
        console.log("Dispatching dataset-upload-success event with dataset ID:", dataset.id);
        const uploadSuccessEvent = new CustomEvent('dataset-upload-success', {
          detail: { datasetId: dataset.id }
        });
        window.dispatchEvent(uploadSuccessEvent);
        
        // Also dispatch the upload:success event directly for the Upload page
        console.log("Dispatching upload:success event with dataset ID:", dataset.id);
        const uploadEvent = new CustomEvent('upload:success', {
          detail: { datasetId: dataset.id }
        });
        window.dispatchEvent(uploadEvent);
        
        return dataset;
      } catch (error) {
        console.error('Error uploading dataset:', error);
        const errorMessage = error instanceof Error ? error.message : "Failed to upload dataset";
        
        setUploadError(errorMessage);
        toast({
          title: "Upload issue",
          description: errorMessage,
          variant: "destructive"
        });
      } finally {
        clearInterval(progressInterval);
        setIsUploading(false);
      }
    } catch (validationError) {
      const errorMessage = validationError instanceof Error ? validationError.message : String(validationError);
      
      setUploadError(errorMessage);
      toast({
        title: "Validation issue",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  /**
   * Handles overwriting an existing file
   */
  const handleOverwriteConfirm = async (isAuthenticated: boolean, userId: string) => {
    setShowOverwriteConfirm(false);
    
    if (datasetToOverwrite) {
      try {
        // Delete the existing dataset
        await dataService.deleteDataset(datasetToOverwrite);
        sonnerToast("Previous version deleted", {
          description: "Previous version of the file has been deleted"
        });
        
        // Wait a moment to ensure deletion completes
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Now upload the new dataset
        await handleUpload(isAuthenticated, userId);
      } catch (error) {
        console.error('Error during overwrite operation:', error);
        toast({
          title: "Overwrite failed",
          description: error instanceof Error ? error.message : "Failed to overwrite dataset",
          variant: "destructive"
        });
      } finally {
        setDatasetToOverwrite(null);
      }
    }
  };

  /**
   * Cancels the overwrite operation
   */
  const handleOverwriteCancel = () => {
    setShowOverwriteConfirm(false);
    setDatasetToOverwrite(null);
  };

  /**
   * Retries a failed upload with improved reliability
   */
  const retryUpload = (isAuthenticated: boolean, userId: string) => {
    setUploadError(null);
    handleUpload(isAuthenticated, userId);
  };

  return {
    dragActive,
    selectedFile,
    datasetName,
    datasetDescription,
    isUploading,
    uploadProgress,
    uploadError,
    schemaPreview,
    uploadedDatasetId,
    showVisualizeAfterUpload,
    showRedirectDialog,
    showOverwriteConfirm,
    setDatasetName,
    setDatasetDescription,
    setUploadedDatasetId,
    setShowVisualizeAfterUpload,
    setShowRedirectDialog,
    handleDrag,
    handleDrop,
    handleFileInput,
    handleUpload,
    retryUpload,
    handleOverwriteConfirm,
    handleOverwriteCancel,
    verifyStorageBucket: verifyStorageBuckets,
    createStorageBucketIfNeeded: setupStorageBuckets
  };
};
