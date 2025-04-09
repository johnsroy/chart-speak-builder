
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
      
      // Step 1: First get storage info for the dataset (we'll need this later)
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
      
      // Step 2: Delete visualizations first - this is critical
      try {
        // Get all queries related to this dataset
        const { data: queries, error: queriesError } = await supabase
          .from('queries')
          .select('id')
          .eq('dataset_id', datasetId);
          
        if (queriesError) {
          console.warn("Error fetching queries for cleanup:", queriesError);
          // Continue with the process anyway
        } else if (queries && queries.length > 0) {
          const queryIds = queries.map(q => q.id);
          console.log(`Found ${queryIds.length} queries to clean up for dataset ${datasetId}`);
          
          if (queryIds.length > 0) {
            // Delete all visualizations related to these queries
            const { error: vizError } = await supabase
              .from('visualizations')
              .delete()
              .in('query_id', queryIds);
              
            if (vizError) {
              console.warn("Error deleting related visualizations:", vizError);
              // We'll still continue with the deletion attempt
            } else {
              console.log(`Successfully deleted visualizations related to dataset ${datasetId}`);
            }
            
            // Wait to ensure database processes deletion
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      } catch (vizErr) {
        console.warn("Error during visualization cleanup:", vizErr);
        // Continue with the process
      }
      
      // Step 3: Now delete all queries for this dataset
      try {
        const { error: deleteQueriesError } = await supabase
          .from('queries')
          .delete()
          .eq('dataset_id', datasetId);
        
        if (deleteQueriesError) {
          console.warn("Error deleting queries:", deleteQueriesError);
          toast.error("Error deleting related queries. Deletion might fail.");
          // But still try to continue with deletion
        } else {
          console.log(`Successfully deleted all queries for dataset ${datasetId}`);
        }
        
        // Wait to ensure database processes deletion
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (queryErr) {
        console.warn("Error during query deletion:", queryErr);
        // Still continue with the process
      }
      
      // Step 4: Wait a moment to let database process deletions
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Step 5: Delete the dataset record itself
      try {
        // Make a separate call to verify queries are gone first
        const { count, error: countError } = await supabase
          .from('queries')
          .select('*', { count: 'exact', head: true })
          .eq('dataset_id', datasetId);
          
        if (countError) {
          console.warn("Error checking if queries exist:", countError);
        } else if (count && count > 0) {
          console.warn(`WARNING: ${count} queries still exist for dataset ${datasetId}`);
          toast.error(`Could not delete all queries for this dataset. Please try again.`);
          throw new Error("Queries still exist for this dataset. Cannot safely delete.");
        }
        
        // If we got here, it's safe to delete the dataset
        const { error: deleteError } = await supabase
          .from('datasets')
          .delete()
          .eq('id', datasetId);
          
        if (deleteError) {
          console.error("Error deleting dataset record:", deleteError);
          throw new Error(deleteError.message || 'Failed to delete dataset');
        }
        
        console.log("Successfully deleted dataset record");
      } catch (deleteErr) {
        console.error("Error deleting dataset record:", deleteErr);
        throw deleteErr;
      }
      
      // Step 6: Delete storage file if we have the info
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
      
      // Step 7: Clear any cached data for this dataset
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
