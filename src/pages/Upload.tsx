
import React, { useState, useEffect } from 'react';
import UserDatasetLibrary from '@/components/upload/UserDatasetLibrary';
import UploadTabContent from '@/components/upload/UploadTabContent';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from '@/components/ui/card';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useDatasets } from '@/hooks/useDatasets';

const Upload = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedStorage, setSelectedStorage] = useState<string | null>(null);
  
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
    handleOverwriteCancel
  } = useFileUpload();

  const {
    datasets,
    selectedDatasetId,
    setSelectedDatasetId,
    isLoading,
    loadDatasets
  } = useDatasets();

  // Function to handle the upload action
  const handleUploadAction = async () => {
    try {
      if (typeof handleUpload === 'function') {
        await handleUpload(true, "00000000-0000-0000-0000-000000000000");
      }
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  // Function to handle retry
  const handleRetryAction = () => {
    try {
      if (typeof retryUpload === 'function') {
        retryUpload(true, "00000000-0000-0000-0000-000000000000");
      }
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  // Function to handle overwrite confirmation
  const handleOverwriteConfirmAction = () => {
    try {
      if (typeof handleOverwriteConfirm === 'function') {
        handleOverwriteConfirm(true, "00000000-0000-0000-0000-000000000000");
      }
    } catch (error) {
      console.error('Overwrite confirmation failed:', error);
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <h1 className="text-2xl font-bold mb-6">Data Explorer</h1>
      
      <Tabs defaultValue="upload" className="w-full flex-grow flex flex-col" onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="upload">Upload New Dataset</TabsTrigger>
          <TabsTrigger value="library">My Dataset Library</TabsTrigger>
        </TabsList>
        
        <div className="flex-grow w-full">
          <TabsContent value="upload" className="h-full">
            <Card className="h-full w-full">
              <CardContent className="pt-6 h-full">
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
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="library" className="h-full">
            <Card className="h-full w-full">
              <CardContent className="pt-6 h-full">
                <UserDatasetLibrary 
                  datasets={datasets}
                  isLoading={isLoading}
                  selectedDatasetId={selectedDatasetId}
                  setSelectedDatasetId={setSelectedDatasetId}
                  onVisualizeClick={() => setActiveTab('visualize')}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default Upload;
