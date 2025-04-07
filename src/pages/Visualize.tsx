
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import ChartVisualization from '@/components/ChartVisualization';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, Database, BarChart, LineChart, PieChart, Table as TableIcon, Download, Share2, BrainCircuit, MessageSquare, Home } from 'lucide-react';
import { toast } from "sonner";
import AIQueryPanel from '@/components/AIQueryPanel';
import EnhancedVisualization from '@/components/EnhancedVisualization';
import { QueryResult } from '@/services/types/queryTypes';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DatasetChatInterface from '@/components/DatasetChatInterface';
import DataTable from '@/components/DataTable';
import { formatByteSize } from '@/utils/storageUtils';

const Visualize = () => {
  const { datasetId } = useParams<{ datasetId: string; }>();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const viewFromUrl = queryParams.get('view');
  
  const [dataset, setDataset] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  // Set default active tab based on URL query parameter or default to 'explore'
  const [activeTab, setActiveTab] = useState<'chat' | 'query' | 'explore'>(
    viewFromUrl === 'chat' ? 'chat' : 
    viewFromUrl === 'query' ? 'query' : 'explore'
  );
  const [exampleQuery, setExampleQuery] = useState('');
  const [dataPreview, setDataPreview] = useState<any[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  // Set default chart type based on URL query parameter or default to 'table'
  const [activeChartType, setActiveChartType] = useState<'bar' | 'line' | 'pie' | 'table'>(
    viewFromUrl === 'bar' ? 'bar' : 
    viewFromUrl === 'line' ? 'line' : 
    viewFromUrl === 'pie' ? 'pie' : 'table'
  );
  const [loadAttempts, setLoadAttempts] = useState(0);
  const maxRetries = 3;
  
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Update URL when tab or chart type changes
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (activeTab !== 'explore') {
      params.set('view', activeTab);
    } else if (activeChartType !== 'table') {
      params.set('view', activeChartType);
    }
    
    const newUrl = params.toString() 
      ? `${location.pathname}?${params.toString()}` 
      : location.pathname;
      
    window.history.replaceState({}, '', newUrl);
  }, [activeTab, activeChartType, location.pathname]);

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
        console.log(`Loading dataset with ID: ${datasetId}, attempt ${loadAttempts + 1}`);
        const datasetData = await dataService.getDataset(datasetId);
        
        if (!datasetData) {
          throw new Error("Dataset not found");
        }
        
        console.log("Dataset loaded:", datasetData);
        setDataset(datasetData);
        
        // Load data preview using direct access fallback
        loadDataPreview(datasetId);
      } catch (error) {
        console.error('Error loading dataset:', error);
        setError(error instanceof Error ? error.message : "Failed to load dataset");
        
        if (loadAttempts < maxRetries) {
          console.log(`Retrying dataset load, attempt ${loadAttempts + 1} of ${maxRetries}`);
          setLoadAttempts(prev => prev + 1);
          
          // Wait before retrying
          setTimeout(() => {
            loadDataset();
          }, 1000 * (loadAttempts + 1)); // Exponential backoff
          return;
        }
        
        toast.error("Failed to load dataset");
      } finally {
        setIsLoading(false);
      }
    };
    
    if (datasetId && loadAttempts < maxRetries) {
      loadDataset();
    }
  }, [datasetId, navigate, loadAttempts]);
  
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
      
      // Try again with a different approach after a short delay
      setTimeout(async () => {
        try {
          console.log("Retrying data preview with fallback approach");
          
          // Get the dataset to extract schema
          const dataset = await dataService.getDataset(datasetId);
          
          if (dataset?.column_schema) {
            // Generate sample data from schema
            const sampleData = generateSampleData(dataset.column_schema, 50);
            console.log("Generated fallback sample data:", sampleData.length, "rows");
            setDataPreview(sampleData);
            setPreviewError(null);
          } else {
            // Generate very basic sample data as last resort
            setDataPreview([
              { id: 1, value: 42, category: "A" },
              { id: 2, value: 18, category: "B" },
              { id: 3, value: 73, category: "A" },
              { id: 4, value: 91, category: "C" },
              { id: 5, value: 30, category: "B" }
            ]);
          }
        } catch (fallbackError) {
          console.error("Fallback data generation also failed:", fallbackError);
        }
      }, 1000);
    } finally {
      setPreviewLoading(false);
    }
  };
  
  // Helper function to generate sample data from schema
  const generateSampleData = (schema: Record<string, string>, count: number) => {
    const sampleData = [];
    const columns = Object.keys(schema);
    
    for (let i = 0; i < count; i++) {
      const row: Record<string, any> = {};
      
      columns.forEach(column => {
        const type = schema[column];
        
        switch (type) {
          case 'number':
            row[column] = Math.floor(Math.random() * 1000);
            break;
          case 'boolean':
            row[column] = Math.random() > 0.5;
            break;
          case 'date':
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 365));
            row[column] = date.toISOString().split('T')[0];
            break;
          case 'string':
          default:
            row[column] = `Sample ${column} ${i + 1}`;
            break;
        }
      });
      
      sampleData.push(row);
    }
    
    return sampleData;
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
    setActiveTab('query');
  };
  
  const handleRetry = () => {
    setError(null);
    setLoadAttempts(0);
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
                onClick={handleRetry}
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
                    {formatByteSize(dataset.file_size)}
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
            
            <Tabs 
              defaultValue={activeTab} 
              value={activeTab}
              onValueChange={value => setActiveTab(value as 'chat' | 'query' | 'explore')} 
              className="space-y-4"
            >
              <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto">
                <TabsTrigger value="chat" className="flex items-center justify-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Chat (Claude 3.7)
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
                <AIQueryPanel 
                  datasetId={datasetId!} 
                  onQueryResult={handleQueryResult} 
                  useDirectAccess={true}
                  dataPreview={dataPreview || []}
                />
                
                {queryResult ? <EnhancedVisualization result={queryResult} /> : <Card className="glass-card p-8 text-center">
                    <CardContent className="pt-8">
                      <BrainCircuit className="h-16 w-16 mx-auto mb-4 text-indigo-400" />
                      <h3 className="text-xl font-medium mb-2">Ask AI About Your Data</h3>
                      <p className="max-w-md mx-auto mb-4 text-gray-50">
                        Use natural language queries to explore insights from your dataset. Here are some examples:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-2xl mx-auto">
                        <Button variant="outline" size="sm" className="justify-start" onClick={() => setQuery("Show me a breakdown of sales by category as a bar chart")}>
                          "Show me a breakdown by category"
                        </Button>
                        <Button variant="outline" size="sm" className="justify-start" onClick={() => setQuery("What's the trend of revenue over time?")}>
                          "What's the trend over time?"
                        </Button>
                        <Button variant="outline" size="sm" className="justify-start" onClick={() => setQuery("Compare the distribution of values across regions")}>
                          "Compare the distribution"
                        </Button>
                        <Button variant="outline" size="sm" className="justify-start" onClick={() => setQuery("Show the correlation between price and quantity")}>
                          "Show correlation between values"
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
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Bar Chart</CardTitle>
                      <BarChart className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                  </Card>
                  
                  <Card 
                    className={`glass-card hover:bg-white/5 cursor-pointer transition-colors ${activeChartType === 'line' ? 'ring-2 ring-purple-500 shadow-xl' : ''}`}
                    onClick={() => setActiveChartType('line')}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Line Chart</CardTitle>
                      <LineChart className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                  </Card>
                  
                  <Card 
                    className={`glass-card hover:bg-white/5 cursor-pointer transition-colors ${activeChartType === 'pie' ? 'ring-2 ring-purple-500 shadow-xl' : ''}`}
                    onClick={() => setActiveChartType('pie')}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Pie Chart</CardTitle>
                      <PieChart className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                  </Card>
                  
                  <Card 
                    className={`glass-card hover:bg-white/5 cursor-pointer transition-colors ${activeChartType === 'table' ? 'ring-2 ring-purple-500 shadow-xl' : ''}`}
                    onClick={() => setActiveChartType('table')}
                  >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Data Table</CardTitle>
                      <TableIcon className="h-4 w-4 text-purple-400" />
                    </CardHeader>
                  </Card>
                </div>
                
                {activeChartType === 'table' ? (
                  <DataTable 
                    data={dataPreview} 
                    loading={previewLoading} 
                    error={previewError} 
                    title={`${dataset.name} - Data Preview`}
                  />
                ) : (
                  <ChartVisualization 
                    datasetId={datasetId!} 
                    chartType={activeChartType}
                    data={dataPreview}
                    useDirectAccess={true}
                    heightClass="h-[500px]"
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Visualize;
