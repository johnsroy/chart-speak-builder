
import React, { useState, useEffect } from 'react';
import { 
  BarChart, PieChart, LineChart, 
  Activity, FileSpreadsheet, Plus, 
  Search, Settings, Download, Database,
  LayoutDashboard, Users, ChevronRight, Upload,
  Home
} from 'lucide-react';
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { dataService, Dataset } from '@/services/dataService';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVertical, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from "@/components/ui/separator"
import { nlpService, QueryResult } from '@/services/nlpService';
import { useAuth } from '@/hooks/useAuth';
import AIQueryPanel from '@/components/AIQueryPanel';
import EnhancedVisualization from '@/components/EnhancedVisualization';

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const { toast } = useToast();
  const { user, isAuthenticated, adminLogin } = useAuth();
  const navigate = useNavigate();

  // Effect to check authentication and redirect if needed
  useEffect(() => {
    const checkAuth = async () => {
      if (!isAuthenticated && !user) {
        // Auto-login with admin account
        await adminLogin();
      }
    };
    
    checkAuth();
  }, [isAuthenticated, user, adminLogin]);

  const { isLoading, error, data: datasets, refetch } = useQuery({
    queryKey: ['datasets'],
    queryFn: () => dataService.getDatasets(),
  });

  const handleDatasetSelect = (dataset: Dataset) => {
    setSelectedDataset(dataset);
    setQueryResult(null); // Clear previous results when selecting a new dataset
  };

  const handleQueryResult = (result: QueryResult) => {
    setQueryResult(result);
  };

  const handleExploreDataset = (datasetId: string) => {
    navigate(`/visualize/${datasetId}`);
  };

  const filteredDatasets = datasets ? datasets.filter(dataset =>
    dataset.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-purple-900 to-blue-900 text-white">
      <div className="container mx-auto py-8">
        {/* Dashboard header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-gradient">Dashboard</h1>
            <p className="text-gray-300">Analyze and visualize your datasets</p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="ghost" className="bg-white/10 backdrop-blur-md border-white/20 hover:bg-white/20">
              <Link to="/upload" className="flex items-center gap-2">
                <Home size={16} />
                Home
              </Link>
            </Button>
            <Button asChild className="purple-gradient">
              <Link to="/upload" className="flex items-center gap-2">
                <Upload size={16} />
                Upload Data
              </Link>
            </Button>
          </div>
        </div>
        
        {/* Stats cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="glass-card p-4 rounded-lg flex items-center gap-4">
            <div className="bg-purple-500/20 p-3 rounded-lg">
              <Database className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-300">Datasets</p>
              <p className="text-2xl font-semibold">
                {isLoading ? <Skeleton className="h-8 w-16" /> : datasets?.length || 0}
              </p>
            </div>
          </div>
          
          <div className="glass-card p-4 rounded-lg flex items-center gap-4">
            <div className="bg-blue-500/20 p-3 rounded-lg">
              <BarChart className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-300">Visualizations</p>
              <p className="text-2xl font-semibold">
                {isLoading ? <Skeleton className="h-8 w-16" /> : datasets?.length || 0}
              </p>
            </div>
          </div>
          
          <div className="glass-card p-4 rounded-lg flex items-center gap-4">
            <div className="bg-green-500/20 p-3 rounded-lg">
              <Users className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-300">User Status</p>
              <p className="text-2xl font-semibold">
                {user ? (user.role === 'admin' ? 'Admin' : 'User') : 'Guest'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="glass-card p-4 mb-6">
              <h2 className="text-xl font-medium mb-4 flex items-center gap-2">
                <Database className="h-5 w-5 text-purple-400" />
                Select Dataset
              </h2>
              <Input
                type="text"
                placeholder="Search datasets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-4"
              />
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : error ? (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <p className="text-red-400">Error: {(error as Error).message}</p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="mt-2 border-red-400/30 hover:bg-red-500/10 text-red-400"
                    onClick={() => refetch()}
                  >
                    Try Again
                  </Button>
                </div>
              ) : filteredDatasets.length > 0 ? (
                <div className="max-h-[50vh] overflow-y-auto">
                  {filteredDatasets.map((dataset) => (
                    <div
                      key={dataset.id}
                      className={`p-3 rounded-md cursor-pointer transition-colors ${selectedDataset?.id === dataset.id 
                        ? 'bg-primary/20 border border-primary/30' 
                        : 'hover:bg-primary/10 border border-transparent'}`}
                      onClick={() => handleDatasetSelect(dataset)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{dataset.name}</p>
                          <p className="text-sm text-gray-400">{dataset.file_name}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem 
                              onClick={() => handleExploreDataset(dataset.id)}
                            >
                              Explore Dataset <ChevronRight className="ml-auto h-4 w-4" />
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              navigator.clipboard.writeText(dataset.id);
                              toast({
                                title: "Dataset ID copied",
                                description: "Dataset ID copied to clipboard.",
                                variant: "success"
                              });
                            }}>
                              Copy Dataset ID <Copy className="ml-auto h-4 w-4" />
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link to={`/upload`}>
                                Edit Dataset <Settings className="ml-auto h-4 w-4" />
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="glass-card p-8 text-center bg-white/5">
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-400 mb-4">No datasets found.</p>
                  <Button asChild variant="outline" className="border-primary/50 bg-primary/10 hover:bg-primary/20">
                    <Link to="/upload" className="flex items-center gap-2">
                      <Plus className="h-4 w-4" /> Upload a dataset
                    </Link>
                  </Button>
                </div>
              )}
            </div>
            {user?.role === 'admin' && (
              <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/40">
                Admin User
              </Badge>
            )}
          </div>

          <div className="md:col-span-2">
            {selectedDataset ? (
              <>
                <AIQueryPanel 
                  datasetId={selectedDataset.id} 
                  onQueryResult={handleQueryResult} 
                />
                
                {queryResult ? (
                  <div className="mt-6">
                    <EnhancedVisualization result={queryResult} />
                  </div>
                ) : (
                  <div className="glass-card p-6 mt-6 text-center">
                    <Activity className="h-12 w-12 mx-auto mb-4 text-indigo-400" />
                    <h3 className="text-xl font-medium mb-2">Ready to Analyze</h3>
                    <p className="text-gray-400 mb-4">
                      Enter a question above to generate insights from your data.
                    </p>
                    <Button 
                      onClick={() => handleExploreDataset(selectedDataset.id)}
                      className="purple-gradient"
                    >
                      Explore Full Visualization
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="glass-card p-8 text-center">
                <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 text-indigo-400" />
                <h3 className="text-xl font-medium mb-2">No Dataset Selected</h3>
                <p className="text-gray-400 mb-6">
                  Select a dataset from the left panel or upload a new one to get started.
                </p>
                <Button asChild className="purple-gradient">
                  <Link to="/upload" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" /> Upload Dataset
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
