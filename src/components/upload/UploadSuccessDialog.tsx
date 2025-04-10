
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { BarChart, CheckCircle, Table } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UploadSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetId: string | null;
  datasetName?: string;
}

const UploadSuccessDialog: React.FC<UploadSuccessDialogProps> = ({
  open,
  onOpenChange,
  datasetId,
  datasetName
}) => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);
  
  useEffect(() => {
    if (open && datasetId) {
      // Store uploaded dataset ID in sessionStorage to help with recovery
      try {
        sessionStorage.setItem('last_uploaded_dataset', datasetId);
      } catch (e) {
        console.warn("Could not store last uploaded dataset ID:", e);
      }
      
      // Set up countdown for auto-redirect
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setTimeout(() => {
              // Navigate to table view of the dataset
              navigate(`/visualize/${datasetId}?view=table`);
            }, 500);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    } else {
      // Reset countdown when dialog closes
      setCountdown(3);
    }
  }, [open, navigate, datasetId]);
  
  const handleViewData = () => {
    onOpenChange(false);
    if (datasetId) {
      navigate(`/visualize/${datasetId}?view=table`);
    } else {
      navigate('/dashboard');
    }
  };
  
  const handleVisualizeData = () => {
    onOpenChange(false);
    if (datasetId) {
      navigate(`/visualize/${datasetId}`);
    } else {
      navigate('/dashboard');
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-none text-center p-6">
        <div className="bg-green-600/20 p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="h-12 w-12 text-green-500" />
        </div>
        
        <h2 className="text-2xl font-bold mb-2">
          Upload Successful!
        </h2>
        
        <p className="text-muted-foreground mb-6">
          {datasetName ? `"${datasetName}" has been uploaded.` : 'Your dataset has been uploaded.'} 
          Redirecting to data view in {countdown}...
        </p>
        
        <div className="flex gap-4 justify-center">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Stay Here
          </Button>
          
          <Button onClick={handleViewData} className="flex items-center gap-2">
            <Table className="h-4 w-4" />
            View Data
          </Button>
          
          <Button variant="secondary" onClick={handleVisualizeData} className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            Visualize Now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UploadSuccessDialog;
