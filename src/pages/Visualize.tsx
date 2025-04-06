
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ChartVisualization from '@/components/ChartVisualization';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, Database, BarChart, LineChart, PieChart, Table as TableIcon, Download, Share2, BrainCircuit, MessageSquare, Home } from 'lucide-react';
import { toast } from "sonner";
import AIQueryPanel from '@/components/AIQueryPanel';
import EnhancedVisualization from '@/components/EnhancedVisualization';
import { QueryResult } from '@/services/nlpService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DatasetChatInterface from '@/components/DatasetChatInterface';
import DataTable from '@/components/DataTable';

const Visualize = () => {
  const { datasetId } = useParams<{ datasetId: string; }>();
  const [dataset, setDataset] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'query' | 'explore'>('chat');
  const [exampleQuery, setExampleQuery] = useState('');
  const [dataPreview, setDataPreview] = useState<any[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [activeChartType, setActiveChartType] = useState<'bar' | 'line' | 'pie' | 'table'>('bar');
  
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const loadDataset = async () => {
      if (!datasetId) {
        toast.error("No dataset ID provided");
        navigate('/dashboard');
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log("Loading dataset with ID:", datasetId);
        const datasetData = await dataService.getDataset(datasetId);
        
        if (!datasetData) {
          throw new Error("Dataset not found");
        }
        
        console.log("Dataset loaded:", datasetData);
        setDataset(datasetData);
        
        // Load data preview
        loadDataPreview(datasetId);
      } catch (error) {
        console.error('Error loading dataset:', error);
        setError(error instanceof Error ? error.message : "Failed to load dataset");
        toast.error("Failed to load dataset");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadDataset();
  }, [datasetId, navigate]);
  
  const loadDataPreview = async (datasetId: string) => {
    setPreviewLoading(true);
    setPreviewError(null);
    
    try {
      console.log("Loading dataset preview for ID:", datasetId);
      const data = await dataService.previewDataset(datasetId);
      console.log("Preview data loaded:", data?.length || 0, "rows");
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No preview data available');
      }
      
      setDataPreview(data);
    } catch (error) {
      console.error('Error loading data preview:', error);
      setPreviewError('Failed to load data preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleQueryResult = (result: QueryResult) => {
    setQueryResult(result);
  };

  const handleDownload = () => {
    toast.success("Download started");
    // In a real app, this would initiate a download of the visualization or data
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Visualization link copied to clipboard");
  };

  const setQuery = (query: string) => {
    setExampleQuery(query);
    toast.info(`Selected example query: "${query}"`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-purple-900 to-blue-900 text-white">
      <div className="container mx-auto py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            className="flex items-center text-gray-300 hover:text-white" 
            onClick={() => navigate('/dashboard')}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
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
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
          </div>
        ) : error ? (
          <div className="glass-card p-12 text-center">
            <Database className="h-16 w-16 mx-auto mb-4 text-red-400" />
            <h2 className="text-2xl font-medium mb-2">Dataset Error</h2>
            <p className="text-red-300 mb-6">{error}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button 
                onClick={() => window.location.reload()}
                variant="outline"
                className="bg-red-900/20 hover:bg-red-900/30 text-white border-red-500/40"
              >
                Retry Loading
              </Button>
              <Button onClick={() => navigate('/dashboard')}>
                Return to Dashboard
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/upload')}
              >
                Upload New Dataset
              </Button>
            </div>
          </div>
        ) : dataset ? (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gradient">{dataset.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-gray-300">{dataset.file_name}</p>
                  <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-500/40">
                    {(dataset.file_size / (1024 * 1024)).toFixed(2)} MB
                  </Badge>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4 md:mt-0">
                <Button variant="outline" size="sm" onClick={handleDownload} className="flex items-center gap-2 bg-violet-900 hover:bg-violet-800">
                  <Download className="h-4 w-4" />
                  Download
                </Button>
                <Button variant="outline" size="sm" onClick={handleShare} className="flex items-center gap-2 bg-violet-800 hover:bg-violet-700">
                  <Share2 className="h-4 w-4" />
                  Share
                </Button>
              </div>
            </div>
            
            <Tabs defaultValue={activeTab} onValueChange={value => setActiveTab(value as 'chat' | 'query' | 'explore')} className="space-y-4">
              <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto">
                <TabsTrigger value="chat" className="flex items-center justify-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="query" className="flex items-center justify-center gap-2">
                  <BrainCircuit className="h-4 w-4" />
                  AI Query
                </TabsTrigger>
                <TabsTrigger value="explore" className="flex items-center justify-center gap-2">
                  <BarChart className="h-4 w-4" />
                  Explore
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="chat" className="space-y-6">
                <DatasetChatInterface datasetId={datasetId!} datasetName={dataset.name} />
              </TabsContent>
              
              <TabsContent value="query" className="space-y-6">
                <AIQueryPanel datasetId={datasetId!} onQueryResult={handleQueryResult} />
                
                {queryResult ? <EnhancedVisualization result={queryResult} /> : <Card className="glass-card p-8 text-center">
                    <CardContent className="pt-8">
                      <BrainCircuit className="h-16 w-16 mx-auto mb-4 text-indigo-400" />
                      <h3 className="text-xl font-medium mb-2 text-red-300">Ask AI About Your Data</h3>
                      <p className="max-w-md mx-auto mb-4 text-gray-50">
                        Use natural language queries to explore insights from your dataset. Here are some examples:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto">
                        <Button variant="outline" size="sm" className="justify-start" onClick={() => setQuery("Show me a breakdown of sales by category as a bar chart")}>
                          "Show me a breakdown of sales by category"
                        </Button>
                        <Button variant="outline" size="sm" className="justify-start" onClick={() => setQuery("What's the trend of revenue over time?")}>
                          "What's the trend of revenue over time?"
                        </Button>
                        <Button variant="outline" size="sm" className="justify-start" onClick={() => setQuery("Compare the distribution of values across regions")}>
                          "Compare the distribution across regions"
                        </Button>
                        <Button variant="outline" size="sm" className="justify-start" onClick={() => setQuery("Show the correlation between price and quantity")}>
                          "Show correlation between price and quantity"
                        </Button>
                      </div>
                    </CardContent>
                  </Card>}
              </TabsContent>
              
              <TabsContent value="explore">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card 
                    className={`glass-card hover:bg-white/5 cursor-pointer transition-colors ${activeChartType === 'bar' ? 'ring-2 ring-purple-500 shadow-xl' : ''}`}
                    onClick={() => setActiveChartType('bar')}
                  >
                    <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${activeChartType === 'bar' ? 'bg-orange-300/50' : 'bg-gray-800/50'}`}>
                      <CardTitle className="text-sm font-medium">Bar Chart</CardTitle>
                      <BarChart className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">Compare values across categories</p>
                    </CardContent>
                  </Card>
                  
                  <Card 
                    className={`glass-card hover:bg-white/5 cursor-pointer transition-colors ${activeChartType === 'line' ? 'ring-2 ring-purple-500 shadow-xl' : ''}`}
                    onClick={() => setActiveChartType('line')}
                  >
                    <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${activeChartType === 'line' ? 'bg-indigo-400/50' : 'bg-gray-800/50'}`}>
                      <CardTitle className="text-sm font-medium">Line Chart</CardTitle>
                      <LineChart className="h-4 w-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">View trends over time</p>
                    </CardContent>
                  </Card>
                  
                  <Card 
                    className={`glass-card hover:bg-white/5 cursor-pointer transition-colors ${activeChartType === 'pie' ? 'ring-2 ring-purple-500 shadow-xl' : ''}`}
                    onClick={() => setActiveChartType('pie')}
                  >
                    <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${activeChartType === 'pie' ? 'bg-red-300/50' : 'bg-gray-800/50'}`}>
                      <CardTitle className="text-sm font-medium">Pie Chart</CardTitle>
                      <PieChart className="h-4 w-4 text-green-400" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">Show proportions of a whole</p>
                    </CardContent>
                  </Card>
                  
                  <Card 
                    className={`glass-card hover:bg-white/5 cursor-pointer transition-colors ${activeChartType === 'table' ? 'ring-2 ring-purple-500 shadow-xl' : ''}`}
                    onClick={() => setActiveChartType('table')}
                  >
                    <CardHeader className={`flex flex-row items-center justify-between space-y-0 pb-2 ${activeChartType === 'table' ? 'bg-lime-300/50' : 'bg-gray-800/50'}`}>
                      <CardTitle className="text-sm font-medium">Data Table</CardTitle>
                      <TableIcon className="h-4 w-4 text-orange-400" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground">View raw tabular data</p>
                    </CardContent>
                  </Card>
                </div>
                
                {activeChartType === 'table' ? (
                  <DataTable 
                    data={dataPreview} 
                    loading={previewLoading} 
                    error={previewError} 
                    title="Dataset Preview" 
                  />
                ) : (
                  <div className="glass-card p-6">
                    <ChartVisualization 
                      datasetId={datasetId!}
                      chartType={activeChartType} 
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="glass-card p-12 text-center">
            <Database className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-medium mb-2">Dataset Not Found</h2>
            <p className="text-gray-400 mb-6">The dataset you're looking for doesn't exist or you don't have permission to view it.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button onClick={() => navigate('/dashboard')}>
                Return to Dashboard
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/upload')}
              >
                Go to Home
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Visualize;
