
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useDatasets } from '@/hooks/useDatasets';
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, MoreHorizontal, BarChart2, LineChart, PieChart, Database, Home, Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { dataService } from '@/services/dataService';
import { getUniqueDatasetsByFilename } from '@/utils/storageUtils';
import DeleteDatasetDialog from '@/components/upload/DeleteDatasetDialog';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, adminLogin } = useAuth();
  const { datasets: allDatasets, isLoading, loadDatasets } = useDatasets();
  const [filterType, setFilterType] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [datasetToDelete, setDatasetToDelete] = useState<{id: string, name: string} | null>(null);
  const [duplicateWarnings, setDuplicateWarnings] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState(false);
  const [datasets, setDatasets] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoading) {
      const uniqueDatasets = getUniqueDatasetsByFilename(allDatasets);
      setDatasets(uniqueDatasets);
      setDuplicateWarnings(uniqueDatasets.length < allDatasets.length);
    }
  }, [allDatasets, isLoading]);

  useEffect(() => {
    const setupAuth = async () => {
      if (!isAuthenticated && !user) {
        console.log("No authenticated user, performing admin login");
        try {
          await adminLogin();
        } catch (error) {
          console.error("Admin login failed:", error);
          toast.error("Authentication error, some features may be limited");
        }
      }
    };

    setupAuth();
  }, [isAuthenticated, user, adminLogin]);

  const handleDatasetDeleted = useCallback(() => {
    loadDatasets();
    if (datasetToDelete) {
      setDatasets(prevDatasets => 
        prevDatasets.filter(dataset => dataset.id !== datasetToDelete.id)
      );
    }
  }, [loadDatasets, datasetToDelete]);

  useEffect(() => {
    const handleDatasetDeletedEvent = (event: CustomEvent) => {
      console.log('Dashboard: Dataset deleted event received:', event.detail?.datasetId);
      
      loadDatasets();
      
      if (event.detail?.datasetId) {
        setDatasets(prevDatasets => 
          prevDatasets.filter(dataset => dataset.id !== event.detail?.datasetId)
        );
      }
    };

    const handleUploadSuccess = () => {
      loadDatasets();
    };

    window.addEventListener('dataset-upload-success', handleUploadSuccess);
    window.addEventListener('upload:success', handleUploadSuccess);
    window.addEventListener('dataset-deleted', handleDatasetDeletedEvent as EventListener);

    return () => {
      window.removeEventListener('dataset-upload-success', handleUploadSuccess);
      window.removeEventListener('upload:success', handleUploadSuccess);
      window.removeEventListener('dataset-deleted', handleDatasetDeletedEvent as EventListener);
    };
  }, [loadDatasets]);

  const handleNewDataset = () => {
    navigate("/upload");
  };

  const handleDeleteClick = (dataset: any) => {
    setDatasetToDelete({
      id: dataset.id,
      name: dataset.name || dataset.file_name
    });
    setDeleteDialogOpen(true);
  };

  const handleRefreshDatasets = async () => {
    setRefreshing(true);
    try {
      await loadDatasets();
      toast.success("Datasets refreshed");
    } catch (error) {
      console.error("Error refreshing datasets:", error);
      toast.error("Failed to refresh datasets");
    } finally {
      setRefreshing(false);
    }
  };
  
  const filteredDatasets = filterType 
    ? datasets.filter(dataset => {
        const fileExt = dataset.file_name.split('.').pop()?.toLowerCase();
        if (filterType === 'csv') return fileExt === 'csv';
        if (filterType === 'excel') return fileExt === 'xlsx' || fileExt === 'xls';
        if (filterType === 'json') return fileExt === 'json';
        return true;
      })
    : datasets;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-purple-900 to-blue-900 text-white">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-gradient">My Datasets</h1>
          <p className="text-gray-300">Visualize, analyze and share your data</p>
        </div>
        
        <div className="flex gap-3 mt-4 md:mt-0">
          <Button 
            variant="outline" 
            className="flex items-center text-gray-300 hover:text-white"
            onClick={handleRefreshDatasets}
            disabled={refreshing}
          >
            {refreshing ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          
          <Button 
            variant="ghost" 
            className="flex items-center text-gray-300 hover:text-white" 
            asChild
          >
            <Link to="/upload">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Link>
          </Button>
          
          <Button onClick={handleNewDataset} className="bg-gradient-to-r from-purple-700 to-purple-600">
            <Plus className="mr-2 h-4 w-4" />
            New Dataset
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" onClick={() => setFilterType(null)}>All</TabsTrigger>
          <TabsTrigger value="csv" onClick={() => setFilterType('csv')}>CSV</TabsTrigger>
          <TabsTrigger value="excel" onClick={() => setFilterType('excel')}>Excel</TabsTrigger>
          <TabsTrigger value="json" onClick={() => setFilterType('json')}>JSON</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="glass-card animate-pulse">
                  <CardHeader>
                    <div className="h-5 bg-gray-700/50 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-700/30 rounded w-1/2 mt-2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-gray-700/20 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredDatasets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDatasets.map(dataset => (
                <Card key={dataset.id} className="glass-card hover:bg-white/5 transition-colors cursor-pointer overflow-hidden" onClick={() => navigate(`/visualize/${dataset.id}`)}>
                  <CardHeader className="relative pb-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="absolute right-4 top-4">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>Options</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={e => {
                          e.stopPropagation();
                          navigate(`/visualize/${dataset.id}`);
                        }}>
                          <BarChart2 className="mr-2 h-4 w-4" />
                          Visualize
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={e => {
                          e.stopPropagation();
                          handleDeleteClick(dataset);
                        }} className="text-red-500">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <CardTitle className="text-base truncate pr-10 max-w-full" title={dataset.name}>
                      {dataset.name}
                    </CardTitle>
                    <CardDescription className="truncate text-xs max-w-full" title={dataset.file_name}>
                      {dataset.file_name} • {(dataset.file_size / (1024 * 1024)).toFixed(2)} MB
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between">
                      <div className="flex space-x-2 mb-2">
                        <div className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs">
                          {dataset.file_name.split('.').pop()?.toUpperCase()}
                        </div>
                        {dataset.row_count > 0 && (
                          <div className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded text-xs">
                            {dataset.row_count.toLocaleString()} rows
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <div className="w-8 h-8 rounded-full bg-purple-600/50 flex items-center justify-center">
                        <BarChart2 className="h-4 w-4" />
                      </div>
                      <div className="w-8 h-8 rounded-full bg-blue-600/50 flex items-center justify-center">
                        <LineChart className="h-4 w-4" />
                      </div>
                      <div className="w-8 h-8 rounded-full bg-green-600/50 flex items-center justify-center">
                        <PieChart className="h-4 w-4" />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="truncate pt-0">
                    <p className="text-xs text-gray-400">
                      Last updated {formatDistanceToNow(new Date(dataset.updated_at), { addSuffix: true })}
                    </p>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Database className="h-12 w-12 mx-auto mb-4 text-gray-500" />
              <h3 className="text-xl font-medium mb-2">No datasets found</h3>
              <p className="text-gray-400 mb-6 max-w-md mx-auto">
                Get started by uploading a dataset from your computer or connecting to an external data source.
              </p>
              <Button onClick={handleNewDataset}>Upload a Dataset</Button>
            </div>
          )}
        </TabsContent>

        {['csv', 'excel', 'json'].map(type => (
          <TabsContent key={type} value={type} className="space-y-4">
            {/* Content is shared with the "all" tab through the filteredDatasets */}
          </TabsContent>
        ))}
      </Tabs>
      
      <DeleteDatasetDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        datasetId={datasetToDelete?.id || null}
        datasetName={datasetToDelete?.name}
        onDeleted={handleDatasetDeleted}
      />
    </div>
  );
};

export default Dashboard;
