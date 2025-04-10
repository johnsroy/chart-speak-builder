
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { extractDatasetNameFromFileName } from '@/utils/chartUtils';
import { FileUploadState, SchemaPreview } from './types';
import { previewFileSchema } from './schemaUtils';

export const initialState: FileUploadState = {
  dragActive: false,
  selectedFile: null,
  datasetName: '',
  datasetDescription: '',
  isUploading: false,
  uploadProgress: 0,
  uploadError: null,
  schemaPreview: null,
  uploadedDatasetId: null,
  showVisualizeAfterUpload: false,
  showRedirectDialog: false,
  showOverwriteConfirm: false,
  overwriteInProgress: false,
  selectedStorage: null,
};

/**
 * Creates handlers for managing file selection and drag & drop
 */
export const useFileHandlers = () => {
  const [state, setState] = useState<FileUploadState>(initialState);

  const updateSelectedFile = useCallback(async (file: File) => {
    setState(prevState => ({
      ...prevState,
      selectedFile: file,
      datasetName: extractDatasetNameFromFileName(file.name),
      uploadProgress: 0,
      uploadError: null,
    }));

    try {
      const preview = await previewFileSchema(file);
      setState(prevState => ({ ...prevState, schemaPreview: preview }));
    } catch (error) {
      console.error("Error previewing file schema:", error);
      toast.error("Could not preview file schema", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
      setState(prevState => ({ ...prevState, schemaPreview: null }));
    }
  }, []);

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setState(prevState => ({ ...prevState, dragActive: true }));
    } else if (e.type === "dragleave") {
      setState(prevState => ({ ...prevState, dragActive: false }));
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setState(prevState => ({ ...prevState, dragActive: false }));
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      updateSelectedFile(file);
    }
  }, [updateSelectedFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      updateSelectedFile(file);
    }
  }, [updateSelectedFile]);

  const setDatasetName = useCallback((name: string) => {
    setState(prevState => ({ ...prevState, datasetName: name }));
  }, []);

  const setDatasetDescription = useCallback((desc: string) => {
    setState(prevState => ({ ...prevState, datasetDescription: desc }));
  }, []);

  const setShowVisualizeAfterUpload = useCallback((show: boolean) => {
    setState(prevState => ({ ...prevState, showVisualizeAfterUpload: show }));
  }, []);

  const setShowRedirectDialog = useCallback((show: boolean) => {
    setState(prevState => ({ ...prevState, showRedirectDialog: show }));
  }, []);

  const setSelectedStorage = useCallback((storage: string | null) => {
    setState(prevState => ({ ...prevState, selectedStorage: storage }));
  }, []);

  const handleOverwriteCancel = useCallback(() => {
    setState(prevState => ({ ...prevState, showOverwriteConfirm: false }));
  }, []);

  return {
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
  };
};
