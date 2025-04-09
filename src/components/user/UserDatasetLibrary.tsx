
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Database, HardDrive, PieChart, FileBarChart, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { Dataset } from '@/services/types/datasetTypes';
import { formatByteSize } from '@/utils/storageUtils';
import DeleteDatasetDialog from '@/components/upload/DeleteDatasetDialog';

const UserDatasetLibrary = () => {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [storageStats, setStorageStats] = useState<{
    totalSize: number;
    datasetCount: number;
    formattedSize: string;
    storageTypes: string[];
    totalFields: number;
  }>({ totalSize: 0, datasetCount: 0, formattedSize: '0 B', storageTypes: [], totalFields: 0 });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState<{id: string, name: string} | null>(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [user?.id]);
  
  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load unique datasets only (no duplicates)
      const userDatasets = await dataService.getUniqueDatasets();
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
  
  const handleDeleteClick = (dataset: Dataset) => {
    setDatasetToDelete({
      id: dataset.id,
      name: dataset.name
    });
    setDeleteDialogOpen(true);
  };
  
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await loadData();
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleViewClick = (datasetId: string) => {
    navigate(`/visualize/${datasetId}`);
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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <HardDrive className="mr-2 h-5 w-5" />
              Storage Statistics
            </CardTitle>
            <CardDescription>Information about your data storage usage</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 px-2"
            onClick={handleRefreshData}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
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
              <span className="text-xl font-bold">{storageStats.totalFields}</span>
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
            <Card key={dataset.id} className="hover:shadow-lg transition-shadow overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="truncate text-base" title={dataset.name}>
                  {dataset.name}
                </CardTitle>
                <CardDescription className="truncate text-xs" title={dataset.file_name}>
                  {dataset.file_name} • {formatByteSize(dataset.file_size || 0)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-muted-foreground">
                    {new Date(dataset.created_at || '').toLocaleDateString()}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {dataset.column_schema ? Object.keys(dataset.column_schema).length : 0} fields
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(dataset)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-100/10"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => handleViewClick(dataset.id)}
                  >
                    <PieChart className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete confirmation dialog */}
      <DeleteDatasetDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        datasetId={datasetToDelete?.id || null}
        datasetName={datasetToDelete?.name}
        onDeleted={loadData}
      />
    </div>
  );
};

export default UserDatasetLibrary;
