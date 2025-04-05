
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
  const handleFileSelection = (file: File) => {
    try {
      validateFileForUpload(file);
      
      setSelectedFile(file);
      setDatasetName(getDatasetNameFromFile(file));
      setUploadError(null);
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
   * Initiates file upload process
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

    try {
      // Validate user ID - simplified validation for admin users
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
        
        return dataset;
      } catch (error) {
        console.error('Error uploading dataset:', error);
        const errorMessage = error instanceof Error ? error.message : "Failed to upload dataset";
        
        setUploadError(errorMessage);
        toast({
          title: "Upload failed",
          description: errorMessage,
          variant: "destructive"
        });
        throw error;
      } finally {
        clearInterval(progressInterval);
        setIsUploading(false);
      }
    } catch (validationError) {
      const errorMessage = validationError instanceof Error ? validationError.message : String(validationError);
      
      toast({
        title: "Validation failed",
        description: errorMessage,
        variant: "destructive"
      });
    }
  };

  /**
   * Retries a failed upload
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
    setDatasetName,
    setDatasetDescription,
    setUploadedDatasetId,
    setShowVisualizeAfterUpload,
    handleDrag,
    handleDrop,
    handleFileInput,
    handleUpload,
    retryUpload,
    verifyStorageBucket: verifyStorageBuckets,
    createStorageBucketIfNeeded: setupStorageBuckets
  };
};
