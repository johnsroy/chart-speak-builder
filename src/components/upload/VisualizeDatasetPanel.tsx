
import React, { useState } from 'react';
import { Database, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChartVisualization from '@/components/ChartVisualization';
import DeleteDatasetDialog from './DeleteDatasetDialog';

interface VisualizeDatasetPanelProps {
  isLoading: boolean;
  datasets: any[];
  selectedDatasetId: string | null;
  setSelectedDatasetId: (id: string) => void;
  onUploadClick: () => void;
  onDatasetDeleted?: () => void;
}

const VisualizeDatasetPanel: React.FC<VisualizeDatasetPanelProps> = ({
  isLoading,
  datasets,
  selectedDatasetId,
  setSelectedDatasetId,
  onUploadClick,
  onDatasetDeleted
}) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const selectedDataset = datasets.find(d => d.id === selectedDatasetId);

  return (
    <div className="glass-card p-6">
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-pulse">Loading datasets...</div>
        </div>
      ) : datasets.length === 0 ? (
        <div className="text-center py-10">
          <Database className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-medium mb-2">No datasets found</h3>
          <p className="text-gray-400 mb-4">Upload a dataset to get started with visualization</p>
          <Button onClick={onUploadClick}>
            <Upload className="h-4 w-4 mr-2" /> Upload Dataset
          </Button>
        </div>
      ) : (
        <div>
          <div className="flex flex-wrap gap-2 mb-6">
            {datasets.map(dataset => (
              <button 
                key={dataset.id} 
                className={`px-3 py-2 rounded-md text-sm ${selectedDatasetId === dataset.id ? 'bg-primary text-white' : 'bg-white/20 hover:bg-white/30'}`} 
                onClick={() => setSelectedDatasetId(dataset.id)}
              >
                {dataset.name}
              </button>
            ))}
          </div>
          
          {selectedDatasetId && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">{selectedDataset?.name}</h3>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="bg-red-600/60 hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete Dataset
                </Button>
              </div>
              <ChartVisualization datasetId={selectedDatasetId} />
            </>
          )}
          
          <DeleteDatasetDialog
            open={showDeleteDialog}
            onOpenChange={setShowDeleteDialog}
            datasetId={selectedDatasetId}
            datasetName={selectedDataset?.name}
            onDeleted={() => {
              if (onDatasetDeleted) onDatasetDeleted();
            }}
          />
        </div>
      )}
    </div>
  );
};

export default VisualizeDatasetPanel;
