
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
      console.log(`Starting deletion process for dataset: ${datasetId}`);
      
      // Step 1: Delete any visualizations related to dataset queries first
      try {
        const { data: queries, error: queriesError } = await supabase
          .from('queries')
          .select('id')
          .eq('dataset_id', datasetId);
          
        if (queriesError) {
          console.warn("Error fetching queries for cleanup:", queriesError);
        }
          
        if (queries && queries.length > 0) {
          const queryIds = queries.map(q => q.id);
          console.log(`Found ${queryIds.length} queries to clean up for dataset ${datasetId}`);
          
          // Delete visualizations that reference these queries
          if (queryIds.length > 0) {
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
        }
      } catch (vizErr) {
        console.warn("Exception when deleting related visualizations:", vizErr);
      }
      
      // Step 2: Delete queries associated with this dataset
      try {
        const { error: queriesDeleteError } = await supabase
          .from('queries')
          .delete()
          .eq('dataset_id', datasetId);
        
        if (queriesDeleteError) {
          console.warn("Error deleting related queries:", queriesDeleteError);
          throw new Error(`Failed to delete related queries: ${queriesDeleteError.message}`);
        } else {
          console.log("Successfully deleted related queries");
        }
      } catch (queryErr) {
        console.warn("Exception when deleting queries:", queryErr);
        // Continue with deletion even if this step fails
      }
      
      // Step 3: Get the storage information for the dataset
      let storageInfo = null;
      try {
        const { data: dataset, error: datasetError } = await supabase
          .from('datasets')
          .select('storage_type, storage_path')
          .eq('id', datasetId)
          .single();
          
        if (datasetError) {
          console.warn("Error getting dataset storage info:", datasetError);
        } else if (dataset) {
          storageInfo = dataset;
          console.log(`Retrieved storage info: ${dataset.storage_type}/${dataset.storage_path}`);
        }
      } catch (infoErr) {
        console.warn("Exception when getting dataset info:", infoErr);
      }
          
      // Step 4: Delete the dataset record itself
      try {
        const { error: deleteError } = await supabase
          .from('datasets')
          .delete()
          .eq('id', datasetId);
          
        if (deleteError) {
          throw new Error(deleteError.message || 'Failed to delete dataset');
        }
        
        console.log("Successfully deleted dataset record");
      } catch (deleteErr) {
        console.error("Error deleting dataset record:", deleteErr);
        throw deleteErr;
      }
      
      // Step 5: Delete the storage file if we have storage info
      if (storageInfo && storageInfo.storage_path && storageInfo.storage_type) {
        try {
          console.log(`Removing file from storage: ${storageInfo.storage_type}/${storageInfo.storage_path}`);
          const { error: storageError } = await supabase
            .storage
            .from(storageInfo.storage_type)
            .remove([storageInfo.storage_path]);
            
          if (storageError) {
            console.warn("Error deleting file from storage:", storageError);
          } else {
            console.log(`Successfully removed storage file: ${storageInfo.storage_path}`);
          }
        } catch (storageErr) {
          console.warn("Exception when deleting from storage:", storageErr);
        }
      }
      
      // Step 6: Clear any cached data for this dataset
      try {
        // Clear all session storage items that might reference this dataset
        const keysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (
            key === `dataset_${datasetId}` ||
            key.includes(datasetId) || 
            key.startsWith('dataset_') ||
            key.startsWith('query_') ||
            key.startsWith('visualization_')
          )) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => {
          try {
            sessionStorage.removeItem(key);
            console.log(`Cleared cache: ${key}`);
          } catch (e) {
            console.warn(`Could not clear cache for ${key}:`, e);
          }
        });
        
        console.log(`Cleared ${keysToRemove.length} cache entries`);
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
      setIsDeleting(false); // Fix the variable name here from setIsLoading to setIsDeleting
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
