
import React, { useState, useEffect } from 'react';
import { Database, Loader2, BarChart2, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { dataService } from '@/services/dataService';
import { useNavigate } from 'react-router-dom';

const UserDatasetLibrary: React.FC = () => {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadDatasets();
    
    // Add event listener for dataset changes
    window.addEventListener('dataset-deleted', loadDatasets);
    window.addEventListener('dataset-upload-success', loadDatasets);
    
    return () => {
      window.removeEventListener('dataset-deleted', loadDatasets);
      window.removeEventListener('dataset-upload-success', loadDatasets);
    };
  }, []);

  const loadDatasets = async () => {
    setIsLoading(true);
    try {
      const data = await dataService.getAllDatasets();
      setDatasets(data);
      setError(null);
    } catch (err) {
      console.error('Failed to load datasets:', err);
      setError('Failed to load datasets. Please try again.');
      toast({
        title: 'Error',
        description: 'Failed to load datasets',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewDataset = (datasetId: string) => {
    navigate(`/visualize/${datasetId}`);
  };

  const handleDeleteDataset = async (datasetId: string) => {
    try {
      await dataService.deleteDataset(datasetId);
      toast({
        title: 'Success',
        description: 'Dataset deleted successfully',
      });
      loadDatasets();
    } catch (err) {
      console.error('Failed to delete dataset:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete dataset',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card p-6 flex justify-center items-center min-h-[300px]">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-6 text-center">
        <Database className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-medium mb-2">Error Loading Datasets</h3>
        <p className="text-gray-400 mb-4">{error}</p>
        <Button onClick={loadDatasets}>Try Again</Button>
      </div>
    );
  }

  if (datasets.length === 0) {
    return (
      <div className="glass-card p-6">
        <div className="text-center py-12">
          <div className="p-4 bg-secondary rounded-full inline-block mb-4">
            <Database className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-lg font-medium mb-2">No Datasets Found</h3>
          <p className="text-gray-400 mb-4">You haven't uploaded any datasets yet</p>
          <Button onClick={() => navigate('/upload')}>Upload Your First Dataset</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h2 className="text-xl font-medium mb-4">Your Dataset Library</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {datasets.map((dataset) => (
          <Card key={dataset.id} className="bg-background/50 backdrop-blur-sm border border-purple-500/20 hover:border-purple-500/40 transition-all">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-medium text-lg truncate">{dataset.name}</h3>
                  <p className="text-sm text-muted-foreground">{dataset.file_name}</p>
                </div>
                <div className="p-2 bg-primary/10 rounded-full">
                  <BarChart2 className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                <p>Size: {(dataset.file_size / 1024 / 1024).toFixed(2)} MB</p>
                <p>Columns: {dataset.column_schema ? Object.keys(dataset.column_schema).length : 0}</p>
                <p>Created: {new Date(dataset.created_at).toLocaleDateString()}</p>
              </div>
            </CardContent>
            <CardFooter className="pt-2 pb-4 flex gap-2 justify-end">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleDeleteDataset(dataset.id)}
                className="text-red-400 border-red-400/30 hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
              <Button 
                size="sm" 
                onClick={() => handleViewDataset(dataset.id)}
              >
                <Eye className="h-4 w-4 mr-1" /> View
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default UserDatasetLibrary;
