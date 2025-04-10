
import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { performUpload, validateUserId } from '@/utils/upload';
import { UseFileUploadResult } from './types';
import { verifyStorageBucket, createStorageBucketIfNeeded } from './storageUtils';
import { useFileHandlers } from './fileHandlers';

/**
 * Custom hook for handling file uploads
 */
export const useFileUpload = (): UseFileUploadResult => {
  const navigate = useNavigate();
  const { 
    state, 
    setState, 
    handleDrag, 
    handleDrop, 
    handleFileInput, 
    setDatasetName, 
    setDatasetDescription, 
    setShowVisualizeAfterUpload, 
    setShowRedirectDialog, 
    setSelectedStorage, 
    handleOverwriteCancel 
  } = useFileHandlers();

  const handleUpload = useCallback(async (isRetry: boolean = false, userId?: string) => {
    if (!state.selectedFile) {
      toast.error("No file selected", {
        description: "Please select a file to upload."
      });
      return;
    }

    if (!state.datasetName) {
      toast.error("Dataset name is required", {
        description: "Please enter a name for your dataset."
      });
      return;
    }

    const user_id = userId || 'system_user';
    const file = state.selectedFile;
    const datasetName = state.datasetName;
    const datasetDescription = state.datasetDescription;

    setState(prevState => ({
      ...prevState,
      isUploading: true,
      uploadProgress: 0,
      uploadError: null,
      overwriteInProgress: false,
    }));

    const progressInterval = setInterval(() => {
      setState(prevState => ({
        ...prevState,
        uploadProgress: Math.min(90, prevState.uploadProgress + (Math.random() * 5) + 1)
      }));
    }, 300);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${datasetName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${fileExt}`;
      const filePath = `uploads/${user_id}/${fileName}`;

      const { data: existingDataset, error: selectError } = await supabase
        .from('datasets')
        .select('*')
        .eq('name', datasetName)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        throw new Error(selectError.message || 'Could not check existing datasets');
      }

      if (existingDataset && !isRetry) {
        console.warn("Dataset with this name already exists");
        clearInterval(progressInterval);
        setState(prevState => ({ 
          ...prevState, 
          showOverwriteConfirm: true,
          isUploading: false,
          uploadProgress: 0
        }));
        return;
      }
      
      setState(prevState => ({ ...prevState, uploadProgress: 20 }));

      const uploadResult = await performUpload(
        file,
        datasetName,
        datasetDescription,
        user_id,
        (progress) => {
          setState(prevState => ({ ...prevState, uploadProgress: progress }));
        },
        { column_schema: state.schemaPreview }
      );

      clearInterval(progressInterval);

      toast.success("Dataset uploaded successfully", {
        description: "Your dataset is now ready for analysis."
      });

      setState(prevState => ({
        ...prevState,
        isUploading: false,
        uploadedDatasetId: uploadResult.id,
        showVisualizeAfterUpload: true,
        selectedFile: null,
        datasetName: '',
        datasetDescription: '',
        schemaPreview: null,
        uploadProgress: 100,
      }));
      
      setTimeout(() => {
        navigate(0);
      }, 2000);
    } catch (uploadError: any) {
      clearInterval(progressInterval);
      console.error("Upload failed:", uploadError);
      toast.error("Upload failed", {
        description: uploadError.message || "An unexpected error occurred during upload."
      });
      setState(prevState => ({
        ...prevState,
        isUploading: false,
        uploadError: uploadError.message || 'Upload failed',
        uploadProgress: 0,
      }));
    }
  }, [state.selectedFile, state.datasetName, state.datasetDescription, state.schemaPreview, navigate, setState]);

  const retryUpload = useCallback(async (isRetry: boolean = false, userId?: string) => {
    await handleUpload(isRetry, userId);
  }, [handleUpload]);

  const handleOverwriteConfirm = useCallback(async (isRetry: boolean = true, userId?: string) => {
    setState(prevState => ({
      ...prevState,
      overwriteInProgress: true,
      isUploading: true,
      uploadProgress: 0
    }));
    
    const progressInterval = setInterval(() => {
      setState(prevState => ({
        ...prevState,
        uploadProgress: Math.min(90, prevState.uploadProgress + (Math.random() * 5) + 1)
      }));
    }, 300);

    try {
      if (!state.selectedFile) {
        clearInterval(progressInterval);
        toast.error("No file selected", {
          description: "The file selection was lost. Please select a file again."
        });
        handleOverwriteCancel();
        return;
      }

      const user_id = userId || 'system_user';
      const file = state.selectedFile;
      const datasetName = state.datasetName;
      const datasetDescription = state.datasetDescription;
      
      const { data: existingDataset, error: selectError } = await supabase
        .from('datasets')
        .select('storage_path, id')
        .eq('name', datasetName)
        .single();

      if (selectError) {
        throw new Error(selectError.message || 'Could not retrieve existing dataset');
      }

      if (!existingDataset?.storage_path) {
        throw new Error('Existing dataset has no storage path');
      }
      
      setState(prevState => ({ ...prevState, uploadProgress: 20 }));

      try {
        const { error: deleteError } = await supabase.storage
          .from('datasets')
          .remove([existingDataset.storage_path]);

        if (deleteError) {
          console.warn("Could not delete previous file:", deleteError);
        }
      } catch (deleteErr) {
        console.warn("Error trying to delete previous file:", deleteErr);
      }
      
      setState(prevState => ({ ...prevState, uploadProgress: 40 }));

      const uploadResult = await performUpload(
        file,
        datasetName,
        datasetDescription,
        user_id,
        (progress) => {
          setState(prevState => ({ ...prevState, uploadProgress: progress }));
        },
        { 
          column_schema: state.schemaPreview,
          overwrite_dataset_id: existingDataset.id
        }
      );

      clearInterval(progressInterval);

      toast.success("Dataset overwritten successfully", {
        description: "The dataset has been updated with your new file."
      });

      setState(prevState => ({
        ...prevState,
        isUploading: false,
        overwriteInProgress: false,
        showOverwriteConfirm: false,
        uploadedDatasetId: uploadResult.id,
        showVisualizeAfterUpload: true,
        selectedFile: null,
        datasetName: '',
        datasetDescription: '',
        schemaPreview: null,
        uploadProgress: 100,
      }));
      
      setTimeout(() => {
        navigate(0);
      }, 2000);
    } catch (overwriteError: any) {
      clearInterval(progressInterval);
      console.error("Overwrite failed:", overwriteError);
      toast.error("Overwrite failed", {
        description: overwriteError.message || "An unexpected error occurred during overwrite."
      });
      setState(prevState => ({
        ...prevState,
        isUploading: false,
        overwriteInProgress: false,
        uploadError: overwriteError.message || 'Overwrite failed',
        uploadProgress: 0,
        showOverwriteConfirm: false,
      }));
    }
  }, [state.selectedFile, state.datasetName, state.datasetDescription, state.schemaPreview, navigate, setState, handleOverwriteCancel]);

  return {
    dragActive: state.dragActive,
    selectedFile: state.selectedFile,
    datasetName: state.datasetName,
    datasetDescription: state.datasetDescription,
    isUploading: state.isUploading,
    uploadProgress: state.uploadProgress,
    uploadError: state.uploadError,
    schemaPreview: state.schemaPreview,
    uploadedDatasetId: state.uploadedDatasetId,
    showVisualizeAfterUpload: state.showVisualizeAfterUpload,
    showRedirectDialog: state.showRedirectDialog,
    showOverwriteConfirm: state.showOverwriteConfirm,
    overwriteInProgress: state.overwriteInProgress,
    selectedStorage: state.selectedStorage,
    handleDrag,
    handleDrop,
    handleFileInput,
    setDatasetName,
    setDatasetDescription,
    handleUpload,
    retryUpload,
    setShowVisualizeAfterUpload,
    setShowRedirectDialog,
    setSelectedStorage,
    handleOverwriteConfirm,
    handleOverwriteCancel,
    verifyStorageBucket,
    createStorageBucketIfNeeded
  };
};
