
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from "sonner";
import { dataService } from '@/services/dataService';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase, verifyStorageBuckets } from '@/lib/supabase';

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
    const validFileTypes = [
      'text/csv', 
      'application/vnd.ms-excel', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json'
    ];
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isCSVByExtension = fileExtension === 'csv';
    
    if (!validFileTypes.includes(file.type) && !isCSVByExtension) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV, Excel or JSON file",
        variant: "destructive"
      });
      return;
    }
    
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
    setDatasetName(file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
    setUploadError(null);
    previewSchemaInference(file);
    
    toast({
      title: "File received",
      description: `Selected: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`
    });
  };

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

  const simulateProgress = () => {
    setUploadProgress(0);
    
    const fileSize = selectedFile?.size || 0;
    
    // More conservative progress simulation for large files
    const interval = fileSize > 10 * 1024 * 1024 ? 2500 : 1000; 
    const maxProgress = 70; // Leave 30% for backend processing 
    
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        // Slow down progress as it gets closer to maxProgress
        if (prev >= maxProgress - 10) {
          return prev + 0.5;
        }
        if (prev >= maxProgress - 20) {
          return prev + 1;
        }
        
        return prev + (fileSize > 10 * 1024 * 1024 ? 2 : 5);
      });
    }, interval);
    
    return progressInterval;
  };

  const verifyStorageBucket = async () => {
    return await verifyStorageBuckets();
  };

  const createStorageBucketIfNeeded = async () => {
    try {
      // Call the edge function to set up buckets
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.error("No active session when creating storage buckets");
        return false;
      }
      
      console.log("Creating storage buckets via edge function");
      const functionUrl = `${process.env.SUPABASE_URL || 'https://rehadpogugijylybwmoe.supabase.co'}/functions/v1/storage-manager/setup`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({})
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to create buckets:", errorText);
        return false;
      }
      
      const result = await response.json();
      console.log("Storage bucket creation result:", result);
      return result.success;
    } catch (error) {
      console.error("Error creating storage buckets:", error);
      return false;
    }
  };

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

    if (!userId) {
      toast({
        title: "Authentication issue",
        description: "Unable to identify the user. Please try logging in again.",
        variant: "destructive"
      });
      return;
    }
    
    // Validate user ID format
    if (userId === 'test-admin-id') {
      userId = '00000000-0000-0000-0000-000000000000';
    } else {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        toast({
          title: "Invalid user ID format",
          description: "Please try logging in again.",
          variant: "destructive"
        });
        return;
      }
    }
    
    setIsUploading(true);
    setUploadError(null);
    const progressInterval = simulateProgress();

    try {
      console.log("Starting upload for user:", userId);
      
      // Explicitly create buckets before proceeding with upload
      console.log("Verifying storage buckets exist...");
      const bucketsVerified = await verifyStorageBuckets();
      
      if (!bucketsVerified) {
        console.log("Buckets not verified, attempting to create them...");
        const bucketsCreated = await createStorageBucketIfNeeded();
        if (!bucketsCreated) {
          throw new Error("Failed to create required storage buckets. Please try again or contact support.");
        }
        console.log("Buckets created successfully");
      } else {
        console.log("Buckets verification successful");
      }
      
      try {
        // Test if we have write permission
        const testBlob = new Blob(["test"], { type: "text/plain" });
        const testFile = new File([testBlob], "test-permission.txt");
        
        const { data: permissionTest, error: permissionError } = await supabase.storage
          .from('datasets')
          .upload(`${userId}/test-permission.txt`, testFile);
        
        if (permissionError) {
          console.error("Storage permission test failed:", permissionError);
          throw new Error(`Storage access denied: ${permissionError.message}`);
        } else {
          console.log("Storage permission test passed, proceeding with upload");
          await supabase.storage.from('datasets').remove([`${userId}/test-permission.txt`]);
        }
      } catch (permTestErr) {
        console.error("Permission test failed:", permTestErr);
      }

      const { data: { session: currentSession } } = await supabase.auth.getSession();

      const dataset = await dataService.uploadDataset(
        selectedFile, 
        datasetName, 
        datasetDescription || undefined,
        null,
        null,
        userId
      );
      
      setUploadProgress(100);
      
      sonnerToast.success("Upload successful", {
        description: `Dataset "${datasetName}" has been uploaded successfully`
      });

      setUploadedDatasetId(dataset.id);
      setShowVisualizeAfterUpload(true);

      setSelectedFile(null);
      setDatasetName('');
      setDatasetDescription('');
      setSchemaPreview(null);

      return dataset;
    } catch (error) {
      console.error('Error uploading dataset:', error);
      let errorMessage = error instanceof Error ? error.message : "Failed to upload dataset";
      
      if (errorMessage.includes('row-level security policy')) {
        errorMessage = "Upload failed due to storage permissions. Please try logging out and back in.";
      }
      
      if (errorMessage.includes('Bucket not found')) {
        errorMessage = "Storage configuration issue. The required storage bucket doesn't exist. Attempting to create it now...";
        // Try one more time to create buckets
        await createStorageBucketIfNeeded();
      }
      
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
  };

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
    verifyStorageBucket,
    createStorageBucketIfNeeded
  };
};
