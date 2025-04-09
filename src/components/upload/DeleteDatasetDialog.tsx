
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from "sonner";
import { dataService } from '@/services/dataService';
import { supabase } from '@/lib/supabase';

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
      console.log(`Deleting dataset with ID: ${datasetId}`);
      
      // First, delete any dataset_data records (if the table exists)
      try {
        const { error: dataError } = await supabase
          .from('dataset_data')
          .delete()
          .eq('dataset_id', datasetId);
        
        if (dataError && !dataError.message.includes('does not exist')) {
          console.warn("Error deleting dataset data:", dataError);
        }
      } catch (dataErr) {
        console.warn("Exception when deleting dataset data:", dataErr);
      }
      
      // Delete the dataset from storage if needed
      try {
        const { data: dataset } = await supabase
          .from('datasets')
          .select('storage_type, storage_path')
          .eq('id', datasetId)
          .single();
          
        if (dataset && dataset.storage_path && dataset.storage_type) {
          console.log(`Removing file from storage: ${dataset.storage_type}/${dataset.storage_path}`);
          const { error: storageError } = await supabase
            .storage
            .from(dataset.storage_type)
            .remove([dataset.storage_path]);
            
          if (storageError) {
            console.warn("Error deleting file from storage:", storageError);
          }
        }
      } catch (storageErr) {
        console.warn("Exception when deleting from storage:", storageErr);
      }
      
      // Delete the dataset record itself
      const { error: deleteError } = await supabase
        .from('datasets')
        .delete()
        .eq('id', datasetId);
        
      if (deleteError) {
        throw new Error(deleteError.message || 'Failed to delete dataset');
      }
      
      // Clear any cached data for this dataset
      try {
        sessionStorage.removeItem(`dataset_${datasetId}`);
      } catch (cacheErr) {
        console.warn("Error clearing dataset cache:", cacheErr);
      }
      
      toast.success("Dataset deleted successfully");
      
      // Close the dialog first
      onOpenChange(false);
      
      // Dispatch custom event for dataset deletion
      window.dispatchEvent(new CustomEvent('dataset-deleted', {
        detail: { datasetId }
      }));
      
      // Call the onDeleted callback after a short delay
      setTimeout(() => {
        onDeleted();
      }, 300);
      
    } catch (error) {
      console.error("Failed to delete dataset:", error);
      toast.error("Failed to delete dataset. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      // Prevent dialog from closing during deletion
      if (isDeleting && !isOpen) return;
      onOpenChange(isOpen);
    }}>
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
