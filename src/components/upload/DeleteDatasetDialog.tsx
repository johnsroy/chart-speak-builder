
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { dataService } from '@/services/dataService';

interface DeleteDatasetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  datasetId: string | null;
  datasetName?: string;
  onDeleted: () => void;
}

const DeleteDatasetDialog: React.FC<DeleteDatasetDialogProps> = ({
  open,
  onOpenChange,
  datasetId,
  datasetName,
  onDeleted
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  
  const handleDelete = async () => {
    if (!datasetId) return;
    
    setIsDeleting(true);
    try {
      await dataService.deleteDataset(datasetId);
      toast.success("Dataset deleted successfully");
      onDeleted();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to delete dataset:", error);
      toast.error("Failed to delete dataset. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Delete Dataset
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {datasetName || "this dataset"}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Dataset'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteDatasetDialog;
