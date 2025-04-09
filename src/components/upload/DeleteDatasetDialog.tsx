
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
      
      // Step 2: Call the Edge Function to delete related queries and visualizations
      try {
        console.log("Calling Edge Function to delete related queries and visualizations...");
        const { data, error } = await supabase.functions.invoke('force-delete-queries', {
          body: { dataset_id: datasetId }
        });
        
        if (error) {
          console.warn("Edge function call failed:", error);
          throw new Error(`Edge function error: ${error.message}`);
        }
        
        console.log("Edge function response:", data);
        
        // Wait to ensure database processes deletion
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (fnError) {
        console.error("Error calling Edge Function:", fnError);
        
        // Fallback: Try using the SQL function
        try {
          console.log("Using SQL function as fallback...");
          const { error: rpcError } = await supabase.rpc('force_delete_queries', {
            dataset_id_param: datasetId
          });
          
          if (rpcError) {
            console.warn("SQL function call failed:", rpcError);
            throw new Error(`RPC error: ${rpcError.message}`);
          }
          
          console.log("Successfully executed force_delete_queries function");
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (sqlError) {
          console.error("Error executing SQL function:", sqlError);
          toast.error("Error deleting related data. Please try again.");
          setIsDeleting(false);
          return;
        }
      }
      
      // Step 3: Verify all queries are deleted before proceeding
      try {
        const { count, error: countError } = await supabase
          .from('queries')
          .select('*', { count: 'exact', head: true })
          .eq('dataset_id', datasetId);
          
        if (countError) {
          console.warn("Error checking if queries exist:", countError);
        } else if (count && count > 0) {
          console.warn(`WARNING: ${count} queries still exist for dataset ${datasetId}`);
          throw new Error(`Could not delete all queries for this dataset. Operation will be aborted.`);
        } else {
          console.log("All queries successfully verified as deleted.");
        }
      } catch (verifyErr) {
        console.error("Error during query verification:", verifyErr);
        toast.error("Failed to delete related data completely. Please try again.");
        setIsDeleting(false);
        return;
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
