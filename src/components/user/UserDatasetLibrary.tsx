
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Database, HardDrive, PieChart, FileBarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";

const UserDatasetLibrary = () => {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [storageStats, setStorageStats] = useState<{
    totalSize: number;
    datasetCount: number;
    formattedSize: string;
    storageTypes: string[];
  }>({ totalSize: 0, datasetCount: 0, formattedSize: '0 B', storageTypes: [] });
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load datasets
        const userDatasets = await dataService.getDatasets();
        setDatasets(userDatasets);
        
        // Load storage stats
        if (user?.id) {
          const stats = await dataService.getStorageStats(user.id);
          setStorageStats(stats);
        }
      } catch (error) {
        console.error('Error loading user library data:', error);
        toast.error('Could not load your datasets');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [user?.id]);
  
  const handleDeleteDataset = async (datasetId: string) => {
    if (!datasetId) return;
    
    try {
      await dataService.deleteDataset(datasetId);
      
      // Update the datasets list after deletion
      setDatasets(prev => prev.filter(dataset => dataset.id !== datasetId));
      
      // Update storage stats
      if (user?.id) {
        const stats = await dataService.getStorageStats(user.id);
        setStorageStats(stats);
      }
      
      toast.success('Dataset deleted successfully');
    } catch (error) {
      console.error('Error deleting dataset:', error);
      toast.error('Failed to delete dataset');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card border-none">
        <CardHeader>
          <CardTitle className="flex items-center">
            <HardDrive className="mr-2 h-5 w-5" />
            Storage Statistics
          </CardTitle>
          <CardDescription>Information about your data storage usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col items-center p-4 rounded-lg bg-primary/10">
              <Database className="h-8 w-8 mb-2 text-primary" />
              <span className="text-xl font-bold">{storageStats.datasetCount}</span>
              <span className="text-sm text-muted-foreground">Total Datasets</span>
            </div>
            <div className="flex flex-col items-center p-4 rounded-lg bg-primary/10">
              <HardDrive className="h-8 w-8 mb-2 text-primary" />
              <span className="text-xl font-bold">{storageStats.formattedSize}</span>
              <span className="text-sm text-muted-foreground">Storage Used</span>
            </div>
            <div className="flex flex-col items-center p-4 rounded-lg bg-primary/10">
              <FileBarChart className="h-8 w-8 mb-2 text-primary" />
              <span className="text-xl font-bold">{datasets.reduce((sum, dataset) => sum + (dataset?.column_schema ? Object.keys(dataset.column_schema).length : 0), 0)}</span>
              <span className="text-sm text-muted-foreground">Total Fields</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {datasets.length === 0 ? (
          <div className="col-span-full text-center p-8">
            <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-medium mb-2">No datasets found</h3>
            <p className="text-muted-foreground mb-4">Upload your first dataset to get started</p>
            <Button onClick={() => navigate('/upload')}>Upload Data</Button>
          </div>
        ) : (
          datasets.map((dataset) => (
            <Card key={dataset.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="truncate">{dataset.name}</CardTitle>
                <CardDescription>
                  {dataset.file_name} • {formatFileSize(dataset.file_size || 0)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-muted-foreground">
                    {new Date(dataset.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {dataset.column_schema ? Object.keys(dataset.column_schema).length : 0} fields
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleDeleteDataset(dataset.id)}
                  >
                    Delete
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => navigate(`/visualize/${dataset.id}`)}
                  >
                    <PieChart className="h-4 w-4 mr-1" />
                    Visualize
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

// Helper function for formatting file sizes
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default UserDatasetLibrary;
