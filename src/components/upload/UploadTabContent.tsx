
import React from 'react';
import FileUploadArea from './FileUploadArea';
import UserDatasetLibrary from '../user/UserDatasetLibrary';
import DatasetVisualizationCard from './DatasetVisualizationCard';
import CloudStoragePanel from './CloudStoragePanel';
import RedirectDialog from './RedirectDialog';

interface UploadTabContentProps {
  activeTab: string;
  dragActive: boolean;
  handleDrag: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedFile: File | null;
  datasetName: string;
  setDatasetName: (name: string) => void;
  datasetDescription: string;
  setDatasetDescription: (description: string) => void;
  schemaPreview: Record<string, string> | null;
  isUploading: boolean;
  uploadProgress: number;
  uploadError: string | null;
  retryUpload: () => void;
  handleUpload: () => void;
  datasets: any[];
  isLoading: boolean;
  selectedDatasetId: string | null;
  setSelectedDatasetId: (id: string | null) => void;
  setActiveTab: (tab: string) => void;
  uploadedDatasetId: string | null;
  showVisualizeAfterUpload: boolean;
  setShowVisualizeAfterUpload: (show: boolean) => void;
  showRedirectDialog: boolean;
  setShowRedirectDialog: (show: boolean) => void;
  selectedStorage: string | null;
  setSelectedStorage: (storage: string | null) => void;
  showOverwriteConfirm?: boolean;
  handleOverwriteConfirm?: () => void;
  handleOverwriteCancel?: () => void;
}

const UploadTabContent: React.FC<UploadTabContentProps> = ({
  activeTab,
  dragActive,
  handleDrag,
  handleDrop,
  handleFileInput,
  selectedFile,
  datasetName,
  setDatasetName,
  datasetDescription,
  setDatasetDescription,
  schemaPreview,
  isUploading,
  uploadProgress,
  uploadError,
  retryUpload,
  handleUpload,
  datasets,
  isLoading,
  selectedDatasetId,
  setSelectedDatasetId,
  setActiveTab,
  uploadedDatasetId,
  showVisualizeAfterUpload,
  setShowVisualizeAfterUpload,
  showRedirectDialog, 
  setShowRedirectDialog,
  selectedStorage,
  setSelectedStorage,
  showOverwriteConfirm = false,
  handleOverwriteConfirm = () => {},
  handleOverwriteCancel = () => {}
}) => {
  return (
    <div className="space-y-6">
      {activeTab === 'upload' && (
        <FileUploadArea
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
          retryUpload={retryUpload}
          handleUpload={handleUpload}
          uploadedDatasetId={uploadedDatasetId}
          showOverwriteConfirm={showOverwriteConfirm}
          handleOverwriteConfirm={handleOverwriteConfirm}
          handleOverwriteCancel={handleOverwriteCancel}
        />
      )}

      {activeTab === 'library' && (
        <UserDatasetLibrary />
      )}

      {activeTab === 'visualize' && (
        <DatasetVisualizationCard 
          datasets={datasets}
          isLoading={isLoading}
          selectedDatasetId={selectedDatasetId}
          setSelectedDatasetId={setSelectedDatasetId}
          setActiveTab={setActiveTab}
        />
      )}

      {activeTab === 'transform' && (
        <CloudStoragePanel 
          selectedStorage={selectedStorage}
          setSelectedStorage={setSelectedStorage}
        />
      )}

      {activeTab === 'export' && (
        <div className="glass-card p-6">
          <h2 className="text-xl font-medium mb-4 text-left">Export & Share</h2>
          <p className="text-gray-300">
            Export your visualizations and insights to share with others.
            Coming soon.
          </p>
        </div>
      )}

      <RedirectDialog 
        open={showRedirectDialog} 
        onOpenChange={setShowRedirectDialog}
        datasetId={uploadedDatasetId}
        showVisualize={showVisualizeAfterUpload}
        setShowVisualize={setShowVisualizeAfterUpload}
      />
    </div>
  );
};

export default UploadTabContent;
