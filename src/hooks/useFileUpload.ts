
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from "sonner";
import { dataService } from '@/services/dataService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

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

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileSelection(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFileSelection(file);
    }
  };

  const handleFileSelection = (file: File) => {
    // Validate file type
    const validFileTypes = [
      'text/csv', 
      'application/vnd.ms-excel', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json'
    ];
    
    if (!validFileTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV, Excel or JSON file",
        variant: "destructive"
      });
      return;
    }
    
    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 100MB",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedFile(file);
    // Auto-fill dataset name with file name (without extension)
    const fileName = file.name;
    setDatasetName(fileName.substring(0, fileName.lastIndexOf('.')) || fileName);
    
    // Preview schema inference
    previewSchemaInference(file);
    
    toast({
      title: "File received",
      description: `Selected: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`
    });
  };

  const previewSchemaInference = async (file: File) => {
    try {
      // Only preview for CSV files
      if (file.type === 'text/csv') {
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

  const simulateProgress = () => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);
    
    return interval;
  };

  const handleUpload = async (isAuthenticated: boolean) => {
    // Check both the isAuthenticated flag and the user state to determine auth status
    if (!isAuthenticated && !user) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload datasets",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }
    
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

    setIsUploading(true);
    setUploadError(null);
    const progressInterval = simulateProgress();
    
    try {
      // Explicitly pass the current user and session to ensure authentication is recognized
      const dataset = await dataService.uploadDataset(
        selectedFile, 
        datasetName, 
        datasetDescription || undefined,
        user,  // Make sure to pass the current user
        session // Make sure to pass the current session
      );
      
      // Set progress to 100% when complete
      setUploadProgress(100);
      
      sonnerToast.success("Upload successful", {
        description: `Dataset "${datasetName}" has been uploaded successfully`
      });

      // Store the uploaded dataset ID for visualization
      setUploadedDatasetId(dataset.id);
      setShowVisualizeAfterUpload(true);

      // Clear form
      setSelectedFile(null);
      setDatasetName('');
      setDatasetDescription('');
      setSchemaPreview(null);

      return dataset;
    } catch (error) {
      console.error('Error uploading dataset:', error);
      setUploadError(error instanceof Error ? error.message : "Failed to upload dataset");
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload dataset",
        variant: "destructive"
      });
      throw error;
    } finally {
      clearInterval(progressInterval);
      setIsUploading(false);
    }
  };

  const retryUpload = (isAuthenticated: boolean) => {
    setUploadError(null);
    handleUpload(isAuthenticated);
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
    retryUpload
  };
};
