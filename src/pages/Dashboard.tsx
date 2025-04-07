import React, { useState, useEffect } from 'react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { dataService } from '@/services/dataService';

const findDuplicateDatasets = (datasets) => {
  const fileMap = new Map();
  
  datasets.forEach(dataset => {
    if (fileMap.has(dataset.file_name)) {
      fileMap.set(dataset.file_name, [...fileMap.get(dataset.file_name), dataset]);
    } else {
      fileMap.set(dataset.file_name, [dataset]);
    }
  });
  
  return Array.from(fileMap).filter(([_, datasets]) => datasets.length > 1);
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, adminLogin } = useAuth();
  const { datasets, isLoading, loadDatasets } = useDatasets();
  const [filterType, setFilterType] = useState<string | null>(null);
  const [deleteDatasetId, setDeleteDatasetId] = useState<string | null>(null);
  const [duplicateWarnings, setDuplicateWarnings] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingDataset, setDeletingDataset] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isLoading && datasets.length > 0) {
      const duplicates = findDuplicateDatasets(datasets);
      if (duplicates.length > 0) {
        setDuplicateWarnings(true);
        toast("Duplicate Datasets Detected", {
          description: `You have ${duplicates.length} files with duplicate uploads. Consider removing duplicates.`,
          duration: 5000
        });
      } else {
        setDuplicateWarnings(false);
      }
    }
  }, [datasets, isLoading]);

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

  useEffect(() => {
    const handleUploadSuccess = (event: any) => {
      const customEvent = event as CustomEvent<{ datasetId: string }>;
      console.log("Detected dataset upload success:", customEvent.detail.datasetId);
      loadDatasets();
    };

    window.addEventListener('dataset-upload-success', handleUploadSuccess);
    window.addEventListener('upload:success', handleUploadSuccess);

    return () => {
      window.removeEventListener('dataset-upload-success', handleUploadSuccess);
      window.removeEventListener('upload:success', handleUploadSuccess);
    };
  }, [loadDatasets]);

  const handleNewDataset = () => {
    navigate("/upload");
  };

  const handleDeleteDataset = async (id: string) => {
    setDeleteDatasetId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteDataset = async () => {
    if (!deleteDatasetId) return;
    
    try {
      setDeletingDataset(true);
      await dataService.deleteDataset(deleteDatasetId);
      toast.success("Dataset deleted successfully");
      loadDatasets();
    } catch (error) {
      console.error("Error deleting dataset:", error);
      toast.error("Failed to delete dataset");
    } finally {
      setShowDeleteConfirm(false);
      setDeleteDatasetId(null);
      setDeletingDataset(false);
    }
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

  const getUniqueDatasets = (allDatasets) => {
    const uniqueMap = new Map();
    
    allDatasets.forEach(dataset => {
      const existing = uniqueMap.get(dataset.file_name);
      if (!existing || new Date(dataset.updated_at) > new Date(existing.updated_at)) {
        uniqueMap.set(dataset.file_name, dataset);
      }
    });
    
    return Array.from(uniqueMap.values());
  };

  const filteredDatasets = filterType 
    ? getUniqueDatasets(datasets).filter(dataset => {
        const fileExt = dataset.file_name.split('.').pop()?.toLowerCase();
        if (filterType === 'csv') return fileExt === 'csv';
        if (filterType === 'excel') return fileExt === 'xlsx' || fileExt === 'xls';
        if (filterType === 'json') return fileExt === 'json';
        return true;
      })
    : getUniqueDatasets(datasets);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-purple-900 to-blue-900 text-white">
      <div className="container mx-auto py-8">
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
        
        {duplicateWarnings && (
          <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div>
              <h3 className="font-medium mb-1">Duplicate Datasets Detected</h3>
              <p className="text-sm text-gray-300">
                You have multiple uploads of the same files. Consider removing duplicates to save space and 
                avoid confusion. When uploading files with the same name, you'll now be asked if you want 
                to overwrite the existing file.
              </p>
            </div>
          </div>
        )}
        
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
                            handleDeleteDataset(dataset.id);
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
                          {dataset.row_count && (
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
      </div>
      
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the dataset and all associated visualizations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteDataset} 
              className="bg-red-500 hover:bg-red-600"
              disabled={deletingDataset}
            >
              {deletingDataset ? (
                <>
                  <span className="mr-2">Deleting</span>
                  <Trash2 className="h-4 w-4 animate-pulse" />
                </>
              ) : (
                <>
                  <span className="mr-2">Delete</span>
                  <Trash2 className="h-4 w-4" />
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;
