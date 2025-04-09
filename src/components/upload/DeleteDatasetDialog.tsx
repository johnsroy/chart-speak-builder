
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
      
      // Step 2: Call the SQL function to delete related queries and visualizations
      try {
        console.log("Using SQL function to delete related queries and visualizations...");
        const { error: rpcError } = await supabase.rpc('force_delete_queries', {
          dataset_id_param: datasetId
        });
        
        if (rpcError) {
          console.warn("SQL function call failed:", rpcError);
          throw new Error(`RPC error: ${rpcError.message}`);
        }
        
        console.log("Successfully executed force_delete_queries function");
        
        // Wait to ensure database processes deletion
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (fnError) {
        console.error("Error executing SQL function:", fnError);
        
        // Don't immediately fail, just log and continue to the next step
        console.log("Continuing with deletion despite query deletion failure");
      }
      
      // Step 3: Verify all queries are deleted before proceeding
      let queriesExist = false;
      try {
        const { count, error: countError } = await supabase
          .from('queries')
          .select('*', { count: 'exact', head: true })
          .eq('dataset_id', datasetId);
          
        if (countError) {
          console.warn("Error checking if queries exist:", countError);
        } else if (count && count > 0) {
          console.warn(`WARNING: ${count} queries still exist for dataset ${datasetId}`);
          queriesExist = true;
        } else {
          console.log("All queries successfully verified as deleted.");
        }
      } catch (verifyErr) {
        console.error("Error during query verification:", verifyErr);
      }
      
      // Delete any remaining queries manually if needed
      if (queriesExist) {
        try {
          console.log("Attempting to manually delete remaining queries...");
          const { data: queries } = await supabase
            .from('queries')
            .select('id')
            .eq('dataset_id', datasetId);
            
          if (queries && queries.length > 0) {
            // Delete visualizations for these queries first
            const queryIds = queries.map(q => q.id);
            
            const { error: vizError } = await supabase
              .from('visualizations')
              .delete()
              .in('query_id', queryIds);
              
            if (vizError) {
              console.warn("Error deleting related visualizations:", vizError);
            }
            
            // Then delete queries
            for (const query of queries) {
              const { error: delError } = await supabase
                .from('queries')
                .delete()
                .eq('id', query.id);
                
              if (delError) {
                console.warn(`Error deleting query ${query.id}:`, delError);
              }
            }
          }
        } catch (err) {
          console.error("Error in manual query cleanup:", err);
        }
      }
      
      // Step 4: Now it's safe to delete the dataset record
      try {
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
        toast.error("Failed to delete dataset. Please try again.");
        setIsDeleting(false);
        return;
      }
      
      // Step 5: Delete storage file if we have the info
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
        // Clear session storage items that might reference this dataset
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (
            key === `dataset_${datasetId}` ||
            key.includes(datasetId) || 
            key.startsWith('dataset_') ||
            key.startsWith('query_') ||
            key.startsWith('visualization_')
          )) {
            try {
              sessionStorage.removeItem(key);
              console.log(`Cleared cache: ${key}`);
            } catch (e) {
              console.warn(`Could not clear cache for ${key}:`, e);
            }
          }
        }
      } catch (cacheErr) {
        console.warn("Error clearing dataset cache:", cacheErr);
      }
      
      toast.success("Dataset deleted successfully");
      
      // Close the dialog first to avoid UI glitches
      onOpenChange(false);
      
      // Allow some time for UI to update before triggering refresh
      setTimeout(() => {
        // Only dispatch the event once
        window.dispatchEvent(new CustomEvent('dataset-deleted', {
          detail: { datasetId }
        }));
        
        // Call the callback last, after a small delay
        setTimeout(() => {
          onDeleted();
        }, 500);
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
