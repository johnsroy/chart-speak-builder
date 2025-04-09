
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { extractDatasetNameFromFileName } from '@/utils/chartUtils';
import { useNavigate } from 'react-router-dom';

interface SchemaPreview {
  [columnName: string]: string;
}

interface UseFileUploadResult {
  dragActive: boolean;
  selectedFile: File | null;
  datasetName: string;
  datasetDescription: string;
  isUploading: boolean;
  uploadProgress: number;
  uploadError: string | null;
  schemaPreview: SchemaPreview | null;
  uploadedDatasetId: string | null;
  showVisualizeAfterUpload: boolean;
  showRedirectDialog: boolean;
  showOverwriteConfirm: boolean;
  overwriteInProgress: boolean;
  selectedStorage: string | null;
  handleDrag: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setDatasetName: (name: string) => void;
  setDatasetDescription: (desc: string) => void;
  handleUpload: (isRetry?: boolean, userId?: string) => Promise<void>;
  retryUpload: (isRetry?: boolean, userId?: string) => Promise<void>;
  setShowVisualizeAfterUpload: (show: boolean) => void;
  setShowRedirectDialog: (show: boolean) => void;
  setSelectedStorage: (storage: string | null) => void;
  handleOverwriteConfirm: (isRetry?: boolean, userId?: string) => Promise<void>;
  handleOverwriteCancel: () => void;
  verifyStorageBucket: () => Promise<boolean>;
  createStorageBucketIfNeeded: () => Promise<boolean>;
}

interface State {
  dragActive: boolean;
  selectedFile: File | null;
  datasetName: string;
  datasetDescription: string;
  isUploading: boolean;
  uploadProgress: number;
  uploadError: string | null;
  schemaPreview: SchemaPreview | null;
  uploadedDatasetId: string | null;
  showVisualizeAfterUpload: boolean;
  showRedirectDialog: boolean;
  showOverwriteConfirm: boolean;
  overwriteInProgress: boolean;
  selectedStorage: string | null;
}

const initialState: State = {
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

export const useFileUpload = (): UseFileUploadResult => {
  const [state, setState] = useState<State>(initialState);
  const navigate = useNavigate();
  
  // Define handleOverwriteCancel early to avoid reference issues
  const handleOverwriteCancel = useCallback(() => {
    setState(prevState => ({ ...prevState, showOverwriteConfirm: false }));
  }, []);

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

  const previewFileSchema = async (file: File): Promise<SchemaPreview> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event: ProgressEvent<FileReader>) => {
        const text = (event.target?.result as string) || '';
        const lines = text.split('\n');
        if (lines.length < 1) {
          reject(new Error("File is empty or has no headers"));
          return;
        }

        const headers = lines[0].split(',').map(header => header.trim());
        if (headers.length === 0) {
          reject(new Error("No columns found in the header row"));
          return;
        }

        const preview: SchemaPreview = {};
        headers.forEach(header => {
          preview[header] = 'string';
        });

        if (lines.length > 1) {
          const firstDataRow = lines[1].split(',');
          if (firstDataRow.length === headers.length) {
            headers.forEach((header, index) => {
              const value = firstDataRow[index].trim();
              if (!isNaN(Number(value))) {
                preview[header] = 'number';
              } else if (!isNaN(Date.parse(value))) {
                preview[header] = 'date';
              }
            });
          }
        }

        resolve(preview);
      };

      reader.onerror = () => {
        reject(new Error("Failed to read the file"));
      };

      reader.readAsText(file, 'UTF-8');
    });
  };

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
    }));

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
        setState(prevState => ({ ...prevState, showOverwriteConfirm: true }));
        return;
      }

      const { data, error } = await supabase.storage
        .from('datasets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw new Error(error.message || 'Could not upload file to storage');
      }

      const publicURL = supabase.storage.from('datasets').getPublicUrl(filePath).data.publicUrl;

      const fileSizeInBytes = file.size;

      const { data: datasetData, error: datasetError } = await supabase
        .from('datasets')
        .insert([
          {
            name: datasetName,
            description: datasetDescription,
            file_name: file.name,
            file_size: fileSizeInBytes,
            storage_path: filePath,
            storage_url: publicURL,
            storage_type: 'datasets',
            user_id: user_id,
            column_schema: state.schemaPreview,
          }
        ])
        .select('id')
        .single();

      if (datasetError) {
        await supabase.storage.from('datasets').remove([filePath]);
        throw new Error(datasetError.message || 'Could not save dataset metadata');
      }

      toast.success("Dataset uploaded successfully", {
        description: "Your dataset is now ready for analysis."
      });

      setState(prevState => ({
        ...prevState,
        isUploading: false,
        uploadedDatasetId: datasetData.id,
        showVisualizeAfterUpload: true,
        selectedFile: null,
        datasetName: '',
        datasetDescription: '',
        schemaPreview: null,
      }));
      
      // Replace router.refresh() with navigate(0)
      navigate(0);
    } catch (uploadError: any) {
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
  }, [state.selectedFile, state.datasetName, state.datasetDescription, state.schemaPreview, navigate]);

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

    try {
      if (!state.selectedFile) {
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

      const { error: deleteError } = await supabase.storage
        .from('datasets')
        .remove([existingDataset.storage_path]);

      if (deleteError) {
        throw new Error(deleteError.message || 'Could not delete previous file version');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${datasetName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.${fileExt}`;
      const filePath = `uploads/${user_id}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('datasets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw new Error(error.message || 'Could not upload file to storage');
      }

      const publicURL = supabase.storage.from('datasets').getPublicUrl(filePath).data.publicUrl;
      const fileSizeInBytes = file.size;

      const { data: datasetData, error: datasetError } = await supabase
        .from('datasets')
        .update({
          file_name: file.name,
          file_size: fileSizeInBytes,
          storage_path: filePath,
          storage_url: publicURL,
          column_schema: state.schemaPreview,
          description: datasetDescription,
        })
        .eq('id', existingDataset.id)
        .select('id')
        .single();

      if (datasetError) {
        await supabase.storage.from('datasets').remove([filePath]);
        throw new Error(datasetError.message || 'Could not update dataset metadata');
      }

      toast.success("Dataset overwritten successfully", {
        description: "The dataset has been updated with your new file."
      });

      setState(prevState => ({
        ...prevState,
        isUploading: false,
        overwriteInProgress: false,
        showOverwriteConfirm: false,
        uploadedDatasetId: datasetData.id,
        showVisualizeAfterUpload: true,
        selectedFile: null,
        datasetName: '',
        datasetDescription: '',
        schemaPreview: null,
      }));
      
      // Replace router.refresh() with navigate(0)
      navigate(0);
    } catch (overwriteError: any) {
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
  }, [state.selectedFile, state.datasetName, state.datasetDescription, state.schemaPreview, navigate, handleOverwriteCancel]);

  const verifyStorageBucket = async (): Promise<boolean> => {
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      if (error) {
        console.error("Error fetching storage buckets:", error);
        return false;
      }

      const bucketExists = buckets.some(bucket => bucket.name === 'datasets');
      return bucketExists;
    } catch (error) {
      console.error("Error verifying storage bucket:", error);
      return false;
    }
  };

  const createStorageBucketIfNeeded = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.storage.createBucket('datasets', { public: true });
      if (error) {
        console.error("Error creating storage bucket:", error);
        toast.error("Could not initialize storage", {
          description: error.message || "Failed to create the necessary storage bucket."
        });
        return false;
      }

      console.log("Storage bucket created successfully:", data);
      return true;
    } catch (error) {
      console.error("Error initializing storage:", error);
      toast.error("Could not initialize storage", {
        description: error instanceof Error ? error.message : "Failed to initialize storage."
      });
      return false;
    }
  };

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
