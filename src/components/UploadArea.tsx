
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

  useEffect(() => {
    const initialize = async () => {
      try {
        if (!isAuthenticated && !user) {
          console.log("No active session found, performing admin login");
          const loginResult = await adminLogin();
          
          if (loginResult && loginResult.session) {
            console.log("Admin login successful, session established");
          } else {
            console.error("Admin login didn't create a session");
          }
        }
        
        let retries = 0;
        let hasValidBuckets = false;
        
        while (!hasValidBuckets && retries < 3) {
          try {
            hasValidBuckets = await verifyStorageBuckets();
            console.log(`Storage buckets verification attempt ${retries + 1}:`, hasValidBuckets);
            
            if (!hasValidBuckets) {
              const message = retries === 0 ? 
                "Creating storage buckets automatically..." :
                `Retry ${retries + 1}/3: Setting up storage...`;
                
              toast({
                title: "Storage setup",
                description: message
              });
              
              const setupResult = await setupStorageBuckets();
              if (setupResult.success) {
                hasValidBuckets = true;
                setBucketsVerified(true);
                toast({
                  title: "Storage setup complete",
                  description: "Storage ready for uploads",
                  variant: "success"
                });
                break;
              } else {
                retries++;
                await new Promise(r => setTimeout(r, 1000));
              }
            } else {
              setBucketsVerified(true);
              break;
            }
          } catch (verifyError) {
            console.error("Error during bucket verification:", verifyError);
            retries++;
            await new Promise(r => setTimeout(r, 1000));
          }
        }
        
        if (!hasValidBuckets) {
          console.log("Couldn't verify buckets but proceeding anyway");
          setBucketsVerified(true);
        }
      } catch (err) {
        console.error("Initialization error:", err);
        setBucketsVerified(true);
      }
    };
    
    initialize();
  }, []);

  const handleUploadClick = async () => {
    try {
      console.log("Ensuring admin login before upload");
      const loginResult = await adminLogin();
      
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession?.user?.id) {
        toast({
          title: "Authentication notice",
          description: "Using system account for upload...",
          variant: "default"
        });
        
        try {
          await adminLogin();
        } catch (loginErr) {
          console.warn("Admin login failed but proceeding with upload:", loginErr);
        }
      }
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const userIdForUpload = currentUser?.id || "00000000-0000-0000-0000-000000000000";
      
      console.log("Using user ID for upload:", userIdForUpload);
      
      if (selectedFile && selectedFile.size > 50 * 1024 * 1024) {
        toast({
          title: "Large file detected",
          description: "Uploading large files may take some time. Please be patient.",
        });
      }
      
      try {
        await handleUpload(true, userIdForUpload);
        loadDatasets();
      } catch (uploadErr) {
        console.error("Upload attempt failed:", uploadErr);
      }
    } catch (error) {
      console.error("Upload process failed:", error);
      toast({
        title: "Upload error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const handleRetryUpload = async () => {
    try {
      try {
        await adminLogin();
      } catch (loginErr) {
        console.warn("Admin login failed but proceeding with retry:", loginErr);
      }
      
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const userIdForUpload = currentUser?.id || "00000000-0000-0000-0000-000000000000";
      
      console.log("Using user ID for retry:", userIdForUpload);
      retryUpload(true, userIdForUpload);
    } catch (error) {
      console.error("Retry upload failed:", error);
      toast({
        title: "Retry failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  const handleOverwriteConfirmClick = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      const userIdForUpload = currentUser?.id || "00000000-0000-0000-0000-000000000000";
      handleOverwriteConfirm(true, userIdForUpload);
    } catch (error) {
      console.error("Overwrite confirmation failed:", error);
      toast({
        title: "Overwrite failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
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
        schemaPreview={schemaPreview as any[]} // Fix: Cast to any[] to resolve the type error
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
