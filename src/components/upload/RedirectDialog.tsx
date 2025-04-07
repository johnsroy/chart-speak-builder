
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Check, Eye, Lightbulb, BrainCircuit, ChartBar } from 'lucide-react';

export interface RedirectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetId: string;
  showVisualize: boolean;
  setShowVisualize: (show: boolean) => void;
}

const RedirectDialog: React.FC<RedirectDialogProps> = ({
  open,
  onOpenChange,
  datasetId,
  showVisualize,
  setShowVisualize
}) => {
  const navigate = useNavigate();

  const handleVisualize = () => {
    onOpenChange(false);
    if (datasetId) {
      navigate(`/visualize/${datasetId}`);
    }
  };

  const handleUploadAnother = () => {
    setShowVisualize(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background/95 backdrop-blur-sm border-purple-500/20 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            <div className="flex items-center justify-center gap-2">
              <Check className="h-6 w-6 text-green-500" />
              Upload Complete
            </div>
          </DialogTitle>
          <DialogDescription className="text-center pt-2">
            Your dataset was uploaded successfully! What would you like to do next?
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4">
          <Button 
            variant="default" 
            className="w-full flex items-center gap-2"
            onClick={handleVisualize}
          >
            <ChartBar className="h-4 w-4" />
            Visualize With Advanced AI
          </Button>
          <Button 
            variant="outline" 
            className="w-full flex items-center gap-2"
            onClick={() => {
              onOpenChange(false);
              if (datasetId) {
                navigate(`/analyze/${datasetId}`);
              }
            }}
          >
            <BrainCircuit className="h-4 w-4" />
            Ask Questions About Your Data
          </Button>
          <Button 
            variant="ghost" 
            className="w-full flex items-center gap-2"
            onClick={handleUploadAnother}
          >
            <Lightbulb className="h-4 w-4" />
            Upload Another Dataset
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RedirectDialog;
