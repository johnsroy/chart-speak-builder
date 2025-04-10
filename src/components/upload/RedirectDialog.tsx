
import React, { useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { BarChart4, Table, CheckCircle } from 'lucide-react';

interface RedirectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetId: string | null;
  showVisualize?: boolean;
  setShowVisualize?: (show: boolean) => void;
}

const RedirectDialog: React.FC<RedirectDialogProps> = ({
  open,
  onOpenChange,
  datasetId,
  showVisualize = true,
  setShowVisualize
}) => {
  const navigate = useNavigate();
  
  const handleRedirectToDataTable = () => {
    if (datasetId) {
      // Always include ?view=table to ensure we're directing to the table view
      navigate(`/visualize/${datasetId}?view=table`);
    } else {
      navigate('/dashboard');
    }
    onOpenChange(false);
  };

  const handleRedirectToVisualizer = () => {
    if (datasetId) {
      navigate(`/visualize/${datasetId}`);
    } else {
      navigate('/dashboard');
    }
    onOpenChange(false);
  };
  
  // Dispatch a custom event when dialog is shown
  useEffect(() => {
    if (open && datasetId) {
      console.log("Redirect dialog opened for dataset:", datasetId);
      
      // Store uploaded dataset ID in sessionStorage to help with recovery
      try {
        sessionStorage.setItem('last_uploaded_dataset', datasetId);
      } catch (e) {
        console.warn("Could not store last uploaded dataset ID:", e);
      }
      
      // Dispatch an event that can be captured elsewhere in the app
      const redirectEvent = new CustomEvent('dataset-redirect-ready', {
        detail: { datasetId }
      });
      window.dispatchEvent(redirectEvent);
      
      // Auto-redirect to the data table view after 2 seconds
      const timer = setTimeout(() => {
        console.log("Auto-redirecting to data table");
        handleRedirectToDataTable();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [open, datasetId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-none">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
          <DialogTitle className="text-xl">Upload Successful!</DialogTitle>
          <DialogDescription className="text-gray-300">
            Your data has been processed and is ready to be explored.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
          <Button 
            onClick={handleRedirectToDataTable} 
            className="flex items-center justify-center gap-2 bg-violet-900 hover:bg-violet-800"
            variant="default"
            autoFocus
          >
            <Table className="h-5 w-5" />
            View Data Table
          </Button>
          
          <Button 
            onClick={handleRedirectToVisualizer} 
            variant="outline"
            className="flex items-center justify-center gap-2"
          >
            <BarChart4 className="h-5 w-5" />
            Visualize Data
          </Button>
        </div>
        
        <DialogFooter className="sm:justify-center">
          <p className="text-xs text-gray-400">Automatically redirecting to data view in 2 seconds...</p>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RedirectDialog;
