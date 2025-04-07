
import React, { useEffect, useState } from 'react';
import NavBar from '@/components/NavBar';
import UploadArea from '@/components/UploadArea';
import Footer from '@/components/Footer';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { Progress } from '@/components/ui/progress';
import RedirectDialog from '@/components/upload/RedirectDialog';

const Upload = () => {
  const navigate = useNavigate();
  const [isUploaded, setIsUploaded] = useState(false);
  const [uploadedDatasetId, setUploadedDatasetId] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [showRedirectDialog, setShowRedirectDialog] = useState(false);
  const [showVisualize, setShowVisualize] = useState(true);
  
  // Listen for successful upload events
  useEffect(() => {
    const handleUploadSuccess = (event: CustomEvent) => {
      console.log('Upload success event received', event.detail);
      setIsUploaded(true);
      setUploadedDatasetId(event.detail.datasetId);
      
      // Start processing timer for 30 seconds
      const totalTime = 30000; // 30 seconds
      const interval = 100; // Update every 100ms
      const steps = totalTime / interval;
      let currentStep = 0;
      
      const progressInterval = setInterval(() => {
        currentStep++;
        const newProgress = Math.min(100, Math.round((currentStep / steps) * 100));
        setProcessingProgress(newProgress);
        
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          
          // Show the redirect dialog when processing is complete
          setShowRedirectDialog(true);
          
          // Automatically redirect to the data table view after a delay
          setTimeout(() => {
            if (event.detail.datasetId) {
              navigate(`/visualize/${event.detail.datasetId}?view=table`);
            } else {
              navigate('/dashboard');
            }
          }, 2000);
          
          toast.success("Dataset processing complete!", {
            description: "Redirecting to data view..."
          });
        }
      }, interval);

      return () => clearInterval(progressInterval);
    };
    
    // Add event listener for both possible event names to ensure it works
    window.addEventListener('upload:success', handleUploadSuccess as EventListener);
    window.addEventListener('dataset-upload-success', handleUploadSuccess as EventListener);
    
    // Clean up
    return () => {
      window.removeEventListener('upload:success', handleUploadSuccess as EventListener);
      window.removeEventListener('dataset-upload-success', handleUploadSuccess as EventListener);
    };
  }, [navigate]);

  const handleCloseRedirectDialog = () => {
    setShowRedirectDialog(false);
    setIsUploaded(false);
    setUploadedDatasetId(null);
    setProcessingProgress(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-purple-900 to-blue-900 text-white">
      <NavBar />
      {!isUploaded ? (
        <div className="pt-24 px-4 pb-16">
          <div className="container mx-auto">
            <h1 className="text-4xl font-bold mb-6 text-gradient">Upload Your Data</h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-12">
              Drag and drop your CSV, Excel, or connect to your cloud storage to start generating insights.
            </p>
            <div className="mx-auto max-w-4xl">
              <UploadArea />
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <div className="glass-card p-8 max-w-md w-full text-center">
            <h2 className="text-2xl font-bold mb-4">Processing Your Data</h2>
            <p className="mb-6 text-gray-300">
              Please wait while we prepare your dataset for analysis and visualization. This may take up to 30 seconds.
            </p>
            <div className="w-full mb-2">
              <Progress value={processingProgress} className="h-2" />
            </div>
            <p className="text-sm text-gray-400">{processingProgress}% complete</p>
            
            {processingProgress >= 100 && (
              <div className="mt-4">
                <p className="text-green-400 font-medium">Processing complete!</p>
                <p className="text-sm text-gray-300 mt-2">Redirecting to data view...</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Redirect dialog that appears after processing */}
      {uploadedDatasetId && (
        <RedirectDialog
          open={showRedirectDialog}
          onOpenChange={setShowRedirectDialog}
          datasetId={uploadedDatasetId}
          showVisualize={showVisualize}
          setShowVisualize={setShowVisualize}
        />
      )}
      
      <Footer />
    </div>
  );
};

export default Upload;
