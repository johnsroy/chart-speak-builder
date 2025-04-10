
import React, { useState } from 'react';
import { Upload, Download, Database, Library, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import StorageBucketVerifier from './upload/StorageBucketVerifier';
import AuthNotice from './upload/AuthNotice';
import UploadInitializer from './upload/UploadInitializer';
import TabButton from './upload/TabButton';
import StorageConnectionDialog from './upload/StorageConnectionDialog';
import UploadTabContent from './upload/UploadTabContent';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useDatasets } from '@/hooks/useDatasets';
import { useUploadActions } from './upload/UploadActions';

const UploadArea = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedStorage, setSelectedStorage] = useState<string | null>(null);
  const [showStorageDialog, setShowStorageDialog] = useState(false);
  const [bucketsVerified, setBucketsVerified] = useState<boolean | null>(null);
  
  const { isAuthenticated, user, adminLogin } = useAuth();
  
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
    overwriteInProgress,
    setDatasetName,
    setDatasetDescription,
    setShowVisualizeAfterUpload,
    setShowRedirectDialog,
    handleDrag,
    handleDrop,
    handleFileInput,
    handleOverwriteCancel
  } = useFileUpload();

  const { 
    handleUploadClick, 
    handleRetryUpload, 
    handleOverwriteConfirmClick 
  } = useUploadActions();

  const {
    datasets,
    selectedDatasetId,
    setSelectedDatasetId,
    isLoading,
    loadDatasets
  } = useDatasets();

  return (
    <div className="container mx-auto py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gradient">Upload or Connect Your Data</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Upload your files or connect to cloud storage to generate powerful visualizations and insights.
        </p>
      </div>
      
      <UploadInitializer setBucketsVerified={setBucketsVerified} />
      
      <AuthNotice 
        isAuthenticated={isAuthenticated} 
        user={user} 
        adminLogin={adminLogin} 
      />
      
      <StorageBucketVerifier 
        bucketsVerified={bucketsVerified} 
        setBucketsVerified={setBucketsVerified} 
      />
      
      <div className="flex justify-center mb-8">
        <div className="glass-card p-2 inline-flex gap-2">
          <TabButton active={activeTab === 'upload'} icon={<Upload className="h-4 w-4 mr-2" />} label="Upload" onClick={() => setActiveTab('upload')} />
          <TabButton active={activeTab === 'library'} icon={<Library className="h-4 w-4 mr-2" />} label="My Library" onClick={() => setActiveTab('library')} />
          <TabButton active={activeTab === 'visualize'} icon={<Database className="h-4 w-4 mr-2" />} label="Visualize" onClick={() => setActiveTab('visualize')} />
          <TabButton active={activeTab === 'transform'} icon={<ExternalLink className="h-4 w-4 mr-2" />} label="Transform" onClick={() => setActiveTab('transform')} />
          <TabButton active={activeTab === 'export'} icon={<Download className="h-4 w-4 mr-2" />} label="Export & Share" onClick={() => setActiveTab('export')} />
        </div>
      </div>
      
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
        retryUpload={handleRetryUpload}
        handleUpload={handleUploadClick}
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
        handleOverwriteConfirm={handleOverwriteConfirmClick}
        handleOverwriteCancel={handleOverwriteCancel}
        overwriteInProgress={overwriteInProgress}
      />

      <StorageConnectionDialog
        open={showStorageDialog}
        onOpenChange={setShowStorageDialog}
        selectedStorage={selectedStorage}
      />
    </div>
  );
};

export default UploadArea;
