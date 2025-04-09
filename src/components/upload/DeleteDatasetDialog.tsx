
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
      
      // First, delete any related queries (these reference the dataset)
      try {
        const { error: queriesError } = await supabase
          .from('queries')
          .delete()
          .eq('dataset_id', datasetId);
        
        if (queriesError) {
          console.warn("Error deleting related queries:", queriesError);
        } else {
          console.log("Successfully deleted related queries");
        }
      } catch (queryErr) {
        console.warn("Exception when deleting queries:", queryErr);
      }
      
      // Then delete any dataset_data records (if the table exists)
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
      
      // Delete any visualizations related to this dataset's queries
      try {
        // First get all query IDs for this dataset
        const { data: queries } = await supabase
          .from('queries')
          .select('id')
          .eq('dataset_id', datasetId);
          
        if (queries && queries.length > 0) {
          const queryIds = queries.map(q => q.id);
          
          // Delete visualizations that reference these queries
          const { error: vizError } = await supabase
            .from('visualizations')
            .delete()
            .in('query_id', queryIds);
            
          if (vizError) {
            console.warn("Error deleting related visualizations:", vizError);
          } else {
            console.log(`Deleted visualizations related to dataset ${datasetId}`);
          }
        }
      } catch (vizErr) {
        console.warn("Exception when deleting related visualizations:", vizErr);
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
          } else {
            console.log(`Successfully removed storage file: ${dataset.storage_path}`);
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
        console.log(`Cleared cache for dataset_${datasetId}`);
        
        // Also try to clear any other caches that might reference this dataset
        const cacheKeys = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.includes(datasetId) || key.startsWith('dataset_'))) {
            cacheKeys.push(key);
          }
        }
        
        cacheKeys.forEach(key => {
          try {
            sessionStorage.removeItem(key);
            console.log(`Cleared additional cache: ${key}`);
          } catch (e) {
            console.warn(`Could not clear cache for ${key}:`, e);
          }
        });
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
