
import React, { useState, useEffect } from 'react';
import { Upload, Download, Database, Library, ExternalLink } from 'lucide-react';
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
import { supabase, setupStorageBuckets, verifyStorageBuckets } from '@/lib/supabase';

const UploadArea = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedStorage, setSelectedStorage] = useState<string | null>(null);
  const [showStorageDialog, setShowStorageDialog] = useState(false);
  const [bucketsVerified, setBucketsVerified] = useState<boolean | null>(null);
  
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

  // Ensure we have a valid user session and storage buckets on component mount
  useEffect(() => {
    const initialize = async () => {
      try {
        // Verify storage buckets exist
        const hasValidBuckets = await verifyStorageBuckets();
        console.log("Storage buckets verification result:", hasValidBuckets);
        setBucketsVerified(hasValidBuckets);
        
        if (!hasValidBuckets) {
          toast({
            title: "Storage configuration issue",
            description: "The required storage buckets are not available. Attempting to create them...",
            variant: "warning"
          });
          
          // Try to set up buckets
          const setupResult = await setupStorageBuckets();
          if (setupResult.success) {
            setBucketsVerified(true);
            toast({
              title: "Storage setup complete",
              description: "Storage buckets were successfully created.",
              variant: "success"
            });
          } else {
            toast({
              title: "Storage setup failed",
              description: setupResult.message || "Could not create required storage buckets. File uploads may fail.",
              variant: "destructive"
            });
          }
        }
        
        // Check if we already have a valid session
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!currentSession) {
          console.log("No active session found, performing admin login");
          await adminLogin();
          
          // Verify login was successful
          const { data: { session: verifySession } } = await supabase.auth.getSession();
          if (verifySession) {
            console.log("Admin login successful, session established");
          } else {
            console.error("Admin login didn't create a session");
          }
        } else {
          console.log("Existing session found:", currentSession.user.id);
        }
      } catch (err) {
        console.error("Initialization error:", err);
      }
    };
    
    initialize();
  }, []);

  const handleUploadClick = async () => {
    try {
      // Make sure storage is configured
      if (bucketsVerified === false) {
        const setupResult = await setupStorageBuckets();
        if (!setupResult.success) {
          toast({
            title: "Storage configuration issue",
            description: "Storage buckets could not be created. Upload will likely fail.",
            variant: "destructive"
          });
        } else {
          setBucketsVerified(true);
        }
      }
      
      // Always ensure we're authenticated before upload
      if (!user?.id) {
        console.log("No user ID found, authenticating before upload");
        await adminLogin();
        
        // Get the session after login
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!currentSession?.user?.id) {
          toast({
            title: "Authentication failed",
            description: "Couldn't establish a user session for uploading",
            variant: "destructive"
          });
          return;
        }
        
        console.log("Using user ID for upload:", currentSession.user.id);
        
        if (selectedFile && selectedFile.size > 50 * 1024 * 1024) {
          toast({
            title: "Large file detected",
            description: "Uploading large files may take some time. Please be patient.",
          });
        }
        
        // Pass the actual UUID from the session
        await handleUpload(true, currentSession.user.id);
      } else {
        console.log("Using existing user ID for upload:", user.id);
        await handleUpload(true, user.id);
      }
      
      loadDatasets();
    } catch (error) {
      console.error("Upload failed:", error);
    }
  };

  const handleRetryUpload = async () => {
    try {
      // Make sure storage is configured
      if (bucketsVerified === false) {
        const setupResult = await setupStorageBuckets();
        if (!setupResult.success) {
          toast({
            title: "Storage configuration issue",
            description: "Storage buckets could not be created. Retry will likely fail.",
            variant: "destructive"
          });
        } else {
          setBucketsVerified(true);
        }
      }
      
      // Ensure authentication before retry
      if (!user?.id) {
        await adminLogin();
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (currentSession?.user?.id) {
          retryUpload(true, currentSession.user.id);
        } else {
          toast({
            title: "Authentication failed",
            description: "Couldn't establish a user session for retrying upload",
            variant: "destructive"
          });
        }
      } else {
        retryUpload(true, user.id);
      }
    } catch (error) {
      console.error("Retry upload failed:", error);
    }
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
      
      {bucketsVerified === false && (
        <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-lg mb-8 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <div>
            <p>Storage system not properly configured. Required buckets are missing.</p>
            <div className="mt-2">
              <Button 
                variant="outline" 
                className="bg-red-500/20 hover:bg-red-500/30 border-red-500/50" 
                onClick={async () => {
                  const result = await setupStorageBuckets();
                  if (result.success) {
                    setBucketsVerified(true);
                    toast({
                      title: "Storage setup complete",
                      description: "Storage buckets were successfully created.",
                      variant: "success"
                    });
                  } else {
                    toast({
                      title: "Storage setup failed",
                      description: result.message || "Could not create required storage buckets.",
                      variant: "destructive"
                    });
                  }
                }}
              >
                Setup Storage Buckets
              </Button>
            </div>
          </div>
        </div>
      )}
      
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
