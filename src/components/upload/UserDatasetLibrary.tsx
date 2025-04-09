
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart4, FileSpreadsheet, Trash2, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatBytes } from '@/utils/formatUtils';
import { formatDate } from '@/utils/formatUtils';
import { supabase } from '@/lib/supabase';

interface UserDatasetLibraryProps {
  datasets?: any[];
  isLoading?: boolean;
  selectedDatasetId?: string | null;
  setSelectedDatasetId?: (id: string | null) => void;
  onVisualizeClick?: () => void;
  deleteDataset?: (id: string) => Promise<boolean>;
}

const UserDatasetLibrary: React.FC<UserDatasetLibraryProps> = ({
  datasets = [],
  isLoading = false,
  selectedDatasetId,
  setSelectedDatasetId,
  onVisualizeClick,
  deleteDataset
}) => {
  const navigate = useNavigate();
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const handleSelectDataset = (id: string) => {
    if (setSelectedDatasetId) {
      setSelectedDatasetId(id);
    }
  };

  const handleViewDataset = (datasetId: string) => {
    navigate(`/visualize/${datasetId}`);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmingDeleteId) return;
    
    setIsDeleting(true);
    try {
      // If provided deleteDataset function exists, use it
      if (deleteDataset) {
        const success = await deleteDataset(confirmingDeleteId);
        if (success) {
          toast.success('Dataset deleted successfully');
          // Close the dialog
          setConfirmDeleteOpen(false);
        }
      } else {
        // Fallback method if no deleteDataset function was provided
        const { error } = await supabase
          .from('datasets')
          .delete()
          .eq('id', confirmingDeleteId);
        
        if (error) {
          throw new Error(error.message);
        }
        
        toast.success('Dataset deleted successfully');
        
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('dataset-deleted', { 
          detail: { datasetId: confirmingDeleteId } 
        }));
        
        // Close the dialog
        setConfirmDeleteOpen(false);
      }
    } catch (error) {
      console.error('Error deleting dataset:', error);
      toast.error('Failed to delete dataset', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsDeleting(false);
      setConfirmingDeleteId(null);
    }
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering dataset selection
    setConfirmingDeleteId(id);
    setConfirmDeleteOpen(true);
  };

  const handleViewClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering dataset selection
    handleViewDataset(id);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading datasets...</p>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12">
        <FileSpreadsheet className="w-12 h-12 text-muted-foreground mb-4" />
        <h3 className="text-xl font-medium mb-2">No datasets found</h3>
        <p className="text-muted-foreground mb-6 max-w-md">
          Upload a dataset to start exploring your data with powerful visualizations and AI insights.
        </p>
        <Button onClick={() => navigate('/upload')}>Upload New Dataset</Button>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Your Dataset Library</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {datasets.map((dataset) => (
          <div
            key={dataset.id}
            onClick={() => handleSelectDataset(dataset.id)}
            className={`rounded-lg p-6 cursor-pointer transition-all ${
              selectedDatasetId === dataset.id
                ? 'bg-gradient-to-br from-purple-900/70 to-indigo-900/70 border-purple-500 shadow-glow'
                : 'bg-black/30 border-gray-800 hover:border-purple-500/40 hover:bg-black/40'
            } border backdrop-blur-sm`}
            data-dataset-id={dataset.id}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h3 className="text-lg font-semibold truncate">{dataset.name}</h3>
                <p className="text-sm text-gray-400 truncate">{dataset.file_name}</p>
              </div>
              <div>
                <BarChart4 className="h-5 w-5 text-purple-400" />
              </div>
            </div>
            
            <div className="space-y-1 mb-4">
              <p className="text-sm">
                <span className="text-gray-400">Size:</span>{' '}
                <span>{formatBytes(dataset.file_size)}</span>
              </p>
              <p className="text-sm">
                <span className="text-gray-400">Columns:</span>{' '}
                <span>{dataset.column_schema ? Object.keys(dataset.column_schema).length : 0}</span>
              </p>
              <p className="text-sm">
                <span className="text-gray-400">Created:</span>{' '}
                <span>{formatDate(dataset.created_at)}</span>
              </p>
            </div>
            
            <div className="flex space-x-2 mt-4">
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={(e) => handleDeleteClick(dataset.id, e)}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onClick={(e) => handleViewClick(dataset.id, e)}
              >
                <Eye className="h-4 w-4 mr-1" /> View
              </Button>
            </div>
          </div>
        ))}
      </div>
      
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="bg-gray-950 border border-gray-800">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this dataset? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => {
                setConfirmDeleteOpen(false);
                setConfirmingDeleteId(null);
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserDatasetLibrary;
