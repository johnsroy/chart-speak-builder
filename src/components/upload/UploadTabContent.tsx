
import React from 'react';
import { Download, ExternalLink } from 'lucide-react';
import FileUploadArea from './FileUploadArea';
import CloudStoragePanel from './CloudStoragePanel';
import DatasetVisualizationCard from './DatasetVisualizationCard';
import VisualizeDatasetPanel from './VisualizeDatasetPanel';
import UserDatasetLibrary from '../user/UserDatasetLibrary';

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
  setSelectedDatasetId: (id: string) => void;
  setActiveTab: (tab: string) => void;
  uploadedDatasetId: string | null;
  showVisualizeAfterUpload: boolean;
  setShowVisualizeAfterUpload: (show: boolean) => void;
  selectedStorage: string | null;
  setSelectedStorage: (storage: string) => void;
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
  selectedStorage,
  setSelectedStorage
}) => {
  if (activeTab === 'upload') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
        />
        
        {uploadedDatasetId && showVisualizeAfterUpload ? (
          <DatasetVisualizationCard 
            datasetId={uploadedDatasetId}
            onHideClick={() => setShowVisualizeAfterUpload(false)}
            onExploreClick={() => {
              setActiveTab('visualize');
              setSelectedDatasetId(uploadedDatasetId);
            }}
          />
        ) : (
          <CloudStoragePanel
            selectedStorage={selectedStorage}
            setSelectedStorage={setSelectedStorage}
          />
        )}
      </div>
    );
  } else if (activeTab === 'visualize') {
    return (
      <VisualizeDatasetPanel
        isLoading={isLoading}
        datasets={datasets}
        selectedDatasetId={selectedDatasetId}
        setSelectedDatasetId={setSelectedDatasetId}
        onUploadClick={() => setActiveTab('upload')}
      />
    );
  } else if (activeTab === 'library') {
    return <UserDatasetLibrary />;
  } else if (activeTab === 'transform') {
    return (
      <div className="glass-card p-6">
        <div className="text-center py-10">
          <ExternalLink className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-medium mb-2">Data Transformation</h3>
          <p className="text-gray-400 mb-4">Transform your data with advanced operations</p>
          <p className="text-sm text-gray-500 mb-6">Coming soon in the next version</p>
        </div>
      </div>
    );
  } else {
    return (
      <div className="glass-card p-6">
        <div className="text-center py-10">
          <Download className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-medium mb-2">Export & Share</h3>
          <p className="text-gray-400 mb-4">Export your visualizations or share them with others</p>
          <p className="text-sm text-gray-500 mb-6">Coming soon in the next version</p>
        </div>
      </div>
    );
  }
};

export default UploadTabContent;
