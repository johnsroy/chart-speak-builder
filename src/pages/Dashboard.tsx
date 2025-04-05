
import React, { useState } from 'react';
import { 
  BarChart, PieChart, LineChart, 
  Activity, FileSpreadsheet, Plus, 
  Search, Settings, Download
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
import { Link } from 'react-router-dom';
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
  const { user } = useAuth();

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

  const filteredDatasets = datasets ? datasets.filter(dataset =>
    dataset.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-purple-900 to-blue-900 text-white">
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-4 text-gradient">Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="glass-card p-4 mb-6">
              <h2 className="text-xl font-medium mb-4">Select Dataset</h2>
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
                <p className="text-red-500">Error: {(error as Error).message}</p>
              ) : filteredDatasets.length > 0 ? (
                <div className="max-h-64 overflow-y-auto">
                  {filteredDatasets.map((dataset) => (
                    <div
                      key={dataset.id}
                      className={`p-3 rounded-md cursor-pointer hover:bg-primary/10 ${selectedDataset?.id === dataset.id ? 'bg-primary/20' : ''}`}
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
                            <DropdownMenuItem onClick={() => {
                              navigator.clipboard.writeText(dataset.id);
                              toast({
                                title: "Dataset ID copied",
                                description: "Dataset ID copied to clipboard.",
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
                <div className="text-center py-4">
                  <p className="text-gray-500">No datasets found.</p>
                  <Button variant="link" asChild>
                    <Link to="/upload">
                      <Plus className="h-4 w-4 mr-2" /> Upload a dataset
                    </Link>
                  </Button>
                </div>
              )}
            </div>
            {user?.role === 'admin' && (
              <Badge variant="outline">Admin</Badge>
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
                <Button asChild>
                  <Link to="/upload">
                    <Plus className="h-4 w-4 mr-2" /> Upload Dataset
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
