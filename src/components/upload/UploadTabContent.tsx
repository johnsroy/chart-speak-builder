
import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import FileUploadArea from './FileUploadArea';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, Check, DownloadCloud, X } from 'lucide-react';
import UserDatasetLibrary from './UserDatasetLibrary';
import { Dataset } from '@/services/types/datasetTypes';
import { Progress } from '@/components/ui/progress';
import CloudStoragePanel from './CloudStoragePanel';
import DatasetVisualizationCard from './DatasetVisualizationCard';
import VisualizeDatasetPanel from './VisualizeDatasetPanel';

interface UploadTabContentProps {
  activeTab: string;
  dragActive: boolean;
  handleDrag: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedFile: File | null;
  datasetName: string;
  setDatasetName: (name: string) => void;
  datasetDescription: string;
  setDatasetDescription: (desc: string) => void;
  schemaPreview: any[] | null;
  isUploading: boolean;
  uploadProgress: number;
  uploadError: string | null;
  handleUpload: () => Promise<void>;
  retryUpload: () => void;
  datasets: Dataset[];
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
  setSelectedStorage: (storage: string) => void;
  showOverwriteConfirm: boolean;
  handleOverwriteConfirm: () => void;
  handleOverwriteCancel: () => void;
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
  handleUpload,
  retryUpload,
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
  showOverwriteConfirm,
  handleOverwriteConfirm,
  handleOverwriteCancel
}) => {
  return (
    <div className="glass-container p-6 rounded-lg">
      {activeTab === "upload" && (
        <div className="animate-fadeIn">
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
            schemaPreview={schemaPreview ? schemaPreview : null}
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
          
          {selectedFile && (
            <div className="mt-6 bg-black/30 p-6 rounded-lg backdrop-blur-md">
              <h3 className="text-xl font-medium mb-4 text-left">Dataset Information</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="datasetName" className="block text-left mb-1">Dataset Name</Label>
                  <Input
                    id="datasetName"
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                    placeholder="Enter a name for your dataset"
                    disabled={isUploading}
                    className="bg-black/20 border-white/20"
                  />
                </div>
                
                <div>
                  <Label htmlFor="datasetDescription" className="block text-left mb-1">Description (optional)</Label>
                  <Textarea
                    id="datasetDescription"
                    value={datasetDescription}
                    onChange={(e) => setDatasetDescription(e.target.value)}
                    placeholder="Describe your dataset"
                    disabled={isUploading}
                    className="bg-black/20 border-white/20"
                  />
                </div>
                
                <div className="pt-4">
                  <Button 
                    onClick={handleUpload} 
                    disabled={isUploading} 
                    className="purple-gradient w-full py-6 text-lg"
                  >
                    {isUploading ? (
                      <span className="flex items-center">
                        Uploading... <Progress value={uploadProgress} className="w-24 h-2 ml-2" />
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <DownloadCloud className="mr-2 h-5 w-5" /> Upload Dataset
                      </span>
                    )}
                  </Button>
                  
                  {uploadError && (
                    <div className="mt-4 bg-red-500/20 border border-red-500/30 p-4 rounded-lg flex items-start">
                      <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                      <div className="flex-1 text-left">
                        <p className="font-medium">Upload Error</p>
                        <p className="text-sm text-gray-300 mt-1">{uploadError}</p>
                        <Button 
                          onClick={retryUpload} 
                          variant="outline"
                          size="sm" 
                          className="mt-2 border-red-500/30 hover:bg-red-500/20 text-white"
                        >
                          Retry Upload
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {showOverwriteConfirm && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
              <div className="glass-card max-w-md w-full p-6 rounded-lg">
                <h3 className="text-xl font-bold mb-4">Dataset Already Exists</h3>
                <p className="mb-6">A dataset with this name already exists. Do you want to overwrite it?</p>
                <div className="flex justify-end space-x-4">
                  <Button onClick={handleOverwriteCancel} variant="outline">Cancel</Button>
                  <Button onClick={handleOverwriteConfirm} className="bg-red-600 hover:bg-red-700">
                    Overwrite
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {activeTab === "library" && (
        <UserDatasetLibrary
          datasets={datasets}
          isLoading={isLoading}
          selectedDatasetId={selectedDatasetId}
          setSelectedDatasetId={setSelectedDatasetId}
          onVisualizeClick={() => setActiveTab('visualize')}
        />
      )}
      
      {activeTab === "visualize" && (
        <div className="animate-fadeIn">
          {!selectedDatasetId && datasets.length > 0 ? (
            <div className="text-center py-8">
              <p className="mb-4">Please select a dataset from your library to visualize</p>
              <Button onClick={() => setActiveTab('library')} variant="outline">
                Go to Library
              </Button>
            </div>
          ) : uploadedDatasetId || selectedDatasetId ? (
            <DatasetVisualizationCard
              datasetId={uploadedDatasetId || selectedDatasetId || undefined}
              setActiveTab={setActiveTab}
            />
          ) : (
            <div className="text-center py-8">
              <p className="mb-4">You don't have any datasets to visualize yet. Upload a dataset first.</p>
              <Button onClick={() => setActiveTab('upload')} variant="outline">
                Go to Upload
              </Button>
            </div>
          )}
        </div>
      )}
      
      {activeTab === "transform" && (
        <VisualizeDatasetPanel
          datasets={selectedDatasetId ? [{ id: selectedDatasetId }] : []}
          showVisualize={showVisualizeAfterUpload}
          setShowVisualize={setShowVisualizeAfterUpload}
        />
      )}
      
      {activeTab === "export" && (
        <CloudStoragePanel
          selectedStorage={selectedStorage}
          setSelectedStorage={setSelectedStorage}
        />
      )}
    </div>
  );
};

export default UploadTabContent;
