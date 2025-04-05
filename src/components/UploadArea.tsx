
import React, { useState, useEffect } from 'react';
import { Upload, Download, Database, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import TabButton from './upload/TabButton';
import StorageConnectionDialog from './upload/StorageConnectionDialog';
import UploadTabContent from './upload/UploadTabContent';
import { useFileUpload } from '@/hooks/useFileUpload';
import { useDatasets } from '@/hooks/useDatasets';
import { toast } from '@/hooks/use-toast';

const UploadArea = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedStorage, setSelectedStorage] = useState<string | null>(null);
  const [showStorageDialog, setShowStorageDialog] = useState(false);
  
  const navigate = useNavigate();
  const { isAuthenticated, user, session, adminLogin } = useAuth();
  
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
    setDatasetName,
    setDatasetDescription,
    setShowVisualizeAfterUpload,
    handleDrag,
    handleDrop,
    handleFileInput,
    handleUpload,
    retryUpload
  } = useFileUpload();

  const {
    datasets,
    selectedDatasetId,
    setSelectedDatasetId,
    isLoading,
    loadDatasets
  } = useDatasets();

  // Attempt admin login on initial load to ensure we're authenticated
  useEffect(() => {
    if (!isAuthenticated && !user) {
      const performAdminLogin = async () => {
        try {
          await adminLogin();
          console.log("Admin login completed on component mount");
        } catch (err) {
          console.error("Failed to perform auto admin login:", err);
        }
      };
      
      performAdminLogin();
    }
  }, []);

  const handleUploadClick = async () => {
    try {
      // Always ensure we have admin authentication before upload
      if (!isAuthenticated || !user) {
        console.log("Performing admin login before upload");
        const authResult = await adminLogin();
        console.log("Admin login result before upload:", authResult);
        
        // Give a moment for auth state to update
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (selectedFile && selectedFile.size > 50 * 1024 * 1024) {
        toast({
          title: "Large file detected",
          description: "Uploading large files may take some time. Please be patient.",
        });
      }
      
      await handleUpload(true);
      loadDatasets();
    } catch (error) {
      console.error("Upload failed after admin login:", error);
    }
  };

  const handleRetryUpload = async () => {
    // Always ensure we have admin authentication before retry
    if (!isAuthenticated || !user) {
      const authResult = await adminLogin();
      console.log("Admin login result before retry:", authResult);
      
      // Give a moment for auth state to update
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    retryUpload(true);
  };

  return (
    <div className="container mx-auto py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gradient">Upload or Connect Your Data</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Upload your files or connect to cloud storage to generate powerful visualizations and insights.
        </p>
      </div>
      
      {!isAuthenticated && !user && (
        <div className="bg-yellow-500/20 border border-yellow-500/50 p-4 rounded-lg mb-8 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <div>
            <p>You need to be logged in to upload and visualize data.</p>
            <div className="mt-2 flex gap-2">
              <Button variant="link" className="p-0 text-primary" onClick={() => navigate('/login')}>Log in</Button>
              <span>or</span>
              <Button variant="link" className="p-0 text-primary" onClick={adminLogin}>Use Admin Account</Button>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex justify-center mb-8">
        <div className="glass-card p-2 inline-flex gap-2">
          <TabButton active={activeTab === 'upload'} icon={<Upload className="h-4 w-4 mr-2" />} label="Upload" onClick={() => setActiveTab('upload')} />
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
        selectedStorage={selectedStorage}
        setSelectedStorage={setSelectedStorage}
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
