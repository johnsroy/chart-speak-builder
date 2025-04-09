
import React, { useState, useEffect } from 'react';
import UserDatasetLibrary from '@/components/upload/UserDatasetLibrary';
import UploadTabContent from '@/components/upload/UploadTabContent';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFileUpload } from '@/hooks/useFileUpload';
import { useDatasets } from '@/hooks/useDatasets';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const Upload = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedStorage, setSelectedStorage] = useState<string | null>(null);
  const [bucketStatus, setBucketStatus] = useState<'checking' | 'ready' | 'error'>('checking');
  
  // Get file upload functionality
  const {
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
    setShowVisualizeAfterUpload,
    setShowRedirectDialog,
    handleDrag,
    handleDrop,
    handleFileInput,
    handleUpload,
    retryUpload,
    handleOverwriteConfirm,
    handleOverwriteCancel,
    verifyStorageBucket,
    createStorageBucketIfNeeded
  } = useFileUpload();

  // Get dataset library functionality
  const {
    datasets,
    selectedDatasetId,
    setSelectedDatasetId,
    isLoading,
    loadDatasets
  } = useDatasets();

  // Check and create storage buckets if needed
  useEffect(() => {
    const checkAndCreateBuckets = async () => {
      try {
        setBucketStatus('checking');
        const bucketsExist = await verifyStorageBucket();
        
        if (!bucketsExist) {
          console.log("Required storage buckets missing, attempting to create");
          const created = await createStorageBucketIfNeeded();
          if (created) {
            toast.success("Storage initialized successfully");
            setBucketStatus('ready');
          } else {
            console.warn("Storage initialization failed but continuing");
            // We'll continue anyway, as the backend handles fallback mechanisms
            setBucketStatus('ready');
          }
        } else {
          console.log("Storage buckets verified");
          setBucketStatus('ready');
        }
      } catch (error) {
        console.error("Error checking storage buckets:", error);
        // Continue anyway with storage error state
        setBucketStatus('error');
      }
    };
    
    checkAndCreateBuckets();
  }, []);

  // Function to handle the upload action
  const handleUploadAction = async () => {
    try {
      if (selectedFile && selectedFile.size > 50 * 1024 * 1024) {
        toast("Large file detected", {
          description: "Uploading large files may take some time. Please be patient."
        });
      }

      await handleUpload(true, "00000000-0000-0000-0000-000000000000");
      loadDatasets();
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  // Function to handle retry
  const handleRetryAction = () => {
    try {
      retryUpload(true, "00000000-0000-0000-0000-000000000000");
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  // Function to handle overwrite confirmation
  const handleOverwriteConfirmAction = () => {
    try {
      handleOverwriteConfirm(true, "00000000-0000-0000-0000-000000000000");
    } catch (error) {
      console.error('Overwrite confirmation failed:', error);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <h1 className="text-2xl font-bold mb-6 text-gradient">Data Explorer</h1>
      
      <div className="w-full h-[calc(100vh-12rem)] flex flex-col bg-black/20 backdrop-blur-md rounded-xl border border-purple-500/20 shadow-glow overflow-hidden">
        <Tabs defaultValue="upload" className="w-full h-full flex flex-col" onValueChange={setActiveTab}>
          <div className="p-4 bg-black/40 backdrop-blur-lg border-b border-purple-500/30">
            <TabsList className="w-full bg-black/30 backdrop-blur-md border border-white/10">
              <TabsTrigger 
                value="upload" 
                className="data-[state=active]:bg-purple-800/50 data-[state=active]:text-white hover:text-white"
              >
                Upload New Dataset
              </TabsTrigger>
              <TabsTrigger 
                value="library" 
                className="data-[state=active]:bg-purple-800/50 data-[state=active]:text-white hover:text-white"
              >
                My Dataset Library
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="flex-grow flex w-full overflow-hidden">
            <TabsContent value="upload" className="h-full w-full m-0 p-4 overflow-auto">
              <UploadTabContent
                activeTab={activeTab}
                dragActive={dragActive}
                handleDrag={handleDrag}
                handleDrop={handleDrop}
                handleFileInput={handleFileInput}
                selectedFile={selectedFile}
                datasetName={datasetName}
                setDatasetName={setDatasetName}
                datasetDescription={datasetDescription}
                setDatasetDescription={setDatasetDescription}
                schemaPreview={schemaPreview}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                uploadError={uploadError}
                handleUpload={handleUploadAction}
                retryUpload={handleRetryAction}
                datasets={datasets}
                isLoading={isLoading}
                selectedDatasetId={selectedDatasetId}
                setSelectedDatasetId={setSelectedDatasetId}
                setActiveTab={setActiveTab}
                uploadedDatasetId={uploadedDatasetId}
                showVisualizeAfterUpload={showVisualizeAfterUpload}
                setShowVisualizeAfterUpload={setShowVisualizeAfterUpload}
                showRedirectDialog={showRedirectDialog}
                setShowRedirectDialog={setShowRedirectDialog}
                selectedStorage={selectedStorage}
                setSelectedStorage={setSelectedStorage}
                showOverwriteConfirm={showOverwriteConfirm}
                handleOverwriteConfirm={handleOverwriteConfirmAction}
                handleOverwriteCancel={handleOverwriteCancel}
              />
            </TabsContent>
            
            <TabsContent value="library" className="h-full w-full m-0 p-4 overflow-auto">
              <UserDatasetLibrary 
                datasets={datasets}
                isLoading={isLoading}
                selectedDatasetId={selectedDatasetId}
                setSelectedDatasetId={setSelectedDatasetId}
                onVisualizeClick={() => setActiveTab('visualize')}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default Upload;
