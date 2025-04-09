import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  BrainCircuit, 
  Database, 
  Loader2, 
  Search, 
  ChevronRight, 
  ArrowRight,
  UploadCloud,
  MessageSquare,
  BarChart,
  PieChart,
  LineChart,
  RefreshCw,
  Zap
} from 'lucide-react';
import { dataService } from '@/services/dataService';
import AIQueryPanel from '@/components/AIQueryPanel';
import EnhancedVisualization from '@/components/EnhancedVisualization';
import { nlpService } from '@/services/nlpService';
import { QueryResult } from '@/services/types/queryTypes';
import { Badge } from '@/components/ui/badge';
import { getUniqueDatasetsByFilename } from '@/utils/storageUtils';

const AnalyzePage = () => {
  const { datasetId } = useParams<{ datasetId: string }>();
  const [datasets, setDatasets] = useState<any[]>([]);
  const [uniqueDatasets, setUniqueDatasets] = useState<any[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [queryText, setQueryText] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDatasets = async () => {
      setIsLoading(true);
      try {
        const result = await dataService.getDatasets();
        const datasetsArray = Array.isArray(result) ? result : [];
        setDatasets(datasetsArray);
        
        const uniqueData = getUniqueDatasetsByFilename(datasetsArray);
        setUniqueDatasets(uniqueData);
        
        if (datasetId && uniqueData.length > 0) {
          const dataset = uniqueData.find(d => d.id === datasetId);
          if (dataset) {
            setSelectedDataset(dataset);
            const recs = nlpService.getRecommendationsForDataset(dataset);
            setRecommendations(recs);
          }
        }
      } catch (error) {
        console.error('Error fetching datasets:', error);
        toast({
          title: "Error loading datasets",
          description: "Could not load your datasets. Please try again later.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchDatasets();
  }, [datasetId, toast]);

  const handleDatasetSelect = (dataset: any) => {
    setSelectedDataset(dataset);
    setQueryResult(null);
    const recs = nlpService.getRecommendationsForDataset(dataset);
    setRecommendations(recs);
    navigate(`/analyze/${dataset.id}`);
  };

  const handleQuerySubmit = async () => {
    if (!selectedDataset || !queryText.trim()) return;

    setIsQuerying(true);
    try {
      const result = await nlpService.processQuery(queryText, selectedDataset.id, "default");
      setQueryResult(result);
    } catch (error) {
      console.error('Error processing query:', error);
      toast({
        title: "Query Error",
        description: error instanceof Error ? error.message : "An error occurred processing your query",
        variant: "destructive",
      });
    } finally {
      setIsQuerying(false);
    }
  };

  const handleRecommendationClick = (recommendation: string) => {
    setQueryText(recommendation);
  };

  const handleTryAnotherQuery = () => {
    setQueryResult(null);
  };

  const renderChartIcon = () => {
    if (!queryResult) return <BarChart className="h-16 w-16 mx-auto mb-4 text-purple-400" />;
    
    const chartType = queryResult.chartType || queryResult.chart_type;
    
    switch (chartType) {
      case 'pie':
        return <PieChart className="h-16 w-16 mx-auto mb-4 text-purple-400" />;
      case 'line':
        return <LineChart className="h-16 w-16 mx-auto mb-4 text-purple-400" />;
      default:
        return <BarChart className="h-16 w-16 mx-auto mb-4 text-purple-400" />;
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-gradient">AI-Powered Analysis</h1>
        <p className="text-gray-300 max-w-3xl">
          Ask questions about your data in natural language and get instant insights and visualizations
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
        </div>
      ) : uniqueDatasets.length === 0 ? (
        <Card className="glass-card p-8 text-center">
          <Database className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <CardTitle className="text-xl mb-2">No Datasets Found</CardTitle>
          <p className="text-gray-400 mb-6">
            You need to upload a dataset before you can analyze it.
          </p>
          <Button onClick={() => navigate('/upload')} className="purple-gradient">
            <UploadCloud className="mr-2 h-4 w-4" />
            Upload Dataset
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Your Datasets</CardTitle>
                <CardDescription>Select a dataset to analyze</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {uniqueDatasets.map(dataset => (
                  <Button
                    key={dataset.id}
                    variant="ghost"
                    className={`w-full justify-start text-left h-auto py-3 ${selectedDataset?.id === dataset.id ? 'bg-purple-900/50 border-l-4 border-purple-500' : 'hover:bg-gray-800/50'}`}
                    onClick={() => handleDatasetSelect(dataset)}
                  >
                    <div className="flex items-center">
                      <Database className="h-4 w-4 mr-2 flex-shrink-0" />
                      <div className="overflow-hidden">
                        <div className="font-medium truncate">{dataset.name}</div>
                        <div className="text-xs text-gray-400 truncate">{dataset.file_name}</div>
                      </div>
                    </div>
                  </Button>
                ))}
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/upload')}
                  className="w-full mt-4 border-purple-500/30 hover:bg-purple-500/20"
                >
                  <UploadCloud className="h-4 w-4 mr-2" />
                  Upload New Dataset
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-3">
            {selectedDataset ? (
              <>
                <Card className="glass-card mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BrainCircuit className="h-5 w-5 text-purple-400" />
                      Ask a Question About "{selectedDataset.name}"
                    </CardTitle>
                    <CardDescription>
                      Use natural language to query your data and generate insights
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 mb-4">
                      <Input
                        value={queryText}
                        onChange={e => setQueryText(e.target.value)}
                        placeholder="e.g., Show me total sales by region as a bar chart"
                        className="bg-black/30 border-purple-500/30 focus:border-purple-500"
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleQuerySubmit();
                        }}
                      />
                      <Button 
                        onClick={handleQuerySubmit}
                        disabled={isQuerying || !queryText.trim()}
                        className="purple-gradient"
                      >
                        {isQuerying ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Search className="h-4 w-4 mr-2" />
                        )}
                        Analyze
                      </Button>
                    </div>
                    
                    <div className="mt-2">
                      <p className="text-sm text-gray-400 mb-2">Suggested questions:</p>
                      <div className="flex flex-wrap gap-2">
                        {recommendations.map((rec, idx) => (
                          <Badge 
                            key={idx}
                            variant="outline" 
                            className="cursor-pointer bg-purple-900/20 hover:bg-purple-900/40 transition-colors"
                            onClick={() => handleRecommendationClick(rec)}
                          >
                            {rec}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {isQuerying ? (
                  <div className="flex flex-col justify-center items-center py-12 glass-card p-6 rounded-xl">
                    <div className="relative">
                      <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
                      <div className="absolute -top-2 -right-2">
                        <div className="animate-ping bg-green-500 rounded-full h-3 w-3"></div>
                      </div>
                    </div>
                    <p className="text-gray-300 mt-4 font-medium">Analyzing your data...</p>
                    <p className="text-gray-400 text-sm mt-2">Generating insights using AI</p>
                  </div>
                ) : queryResult ? (
                  <div className="space-y-6 animate-fadeIn">
                    <Card className="glass-card overflow-hidden border-purple-500/20">
                      <CardHeader className="bg-purple-900/20">
                        <CardTitle className="flex items-center text-xl">
                          <Zap className="h-5 w-5 mr-2 text-purple-400" />
                          Analysis Result 
                          <Badge variant="outline" className="ml-3 bg-purple-900/50 border-purple-500/50">
                            {queryResult.chartType || queryResult.chart_type || 'Visualization'}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-6">
                        <EnhancedVisualization 
                          result={queryResult} 
                          height={400} 
                          showTitle={false}
                          className="bg-transparent border-0 shadow-none"
                        />
                      </CardContent>
                      <CardFooter className="flex justify-between border-t border-gray-800 pt-4">
                        <Button 
                          variant="outline" 
                          onClick={handleTryAnotherQuery}
                          className="border-purple-500/30 hover:bg-purple-500/20"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Try Another Query
                        </Button>
                        <Button
                          onClick={() => navigate(`/visualize/${selectedDataset.id}?query=${encodeURIComponent(queryText)}`)}
                          className="bg-purple-700 hover:bg-purple-600"
                        >
                          Advanced Visualization <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>
                ) : (
                  <div className="glass-card p-8 text-center rounded-xl">
                    {renderChartIcon()}
                    <h3 className="text-xl font-medium mb-2">AI-Powered Data Analysis</h3>
                    <p className="text-gray-300 mb-6 max-w-lg mx-auto">
                      Ask questions about your data in natural language and GenBI will generate visualizations and insights automatically.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                      <div className="glass-container p-4 rounded-lg hover:bg-purple-900/20 transition-colors cursor-pointer"
                          onClick={() => setQueryText("Show me sales trends over time")}>
                        <MessageSquare className="h-5 w-5 mb-2 text-purple-400" />
                        <p className="text-sm">"Show me sales trends over time"</p>
                      </div>
                      <div className="glass-container p-4 rounded-lg hover:bg-purple-900/20 transition-colors cursor-pointer"
                          onClick={() => setQueryText("Compare revenue by region as a bar chart")}>
                        <BarChart className="h-5 w-5 mb-2 text-purple-400" />
                        <p className="text-sm">"Compare revenue by region as a bar chart"</p>
                      </div>
                      <div className="glass-container p-4 rounded-lg hover:bg-purple-900/20 transition-colors cursor-pointer"
                          onClick={() => setQueryText("What are the main factors affecting customer satisfaction?")}>
                        <BrainCircuit className="h-5 w-5 mb-2 text-purple-400" />
                        <p className="text-sm">"What are the main factors affecting customer satisfaction?"</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Card className="glass-card p-8 text-center">
                <Database className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <CardTitle className="text-xl mb-2">Select a Dataset</CardTitle>
                <p className="text-gray-400 mb-6">
                  Choose a dataset from the sidebar to start analyzing it with AI
                </p>
                <div className="flex justify-center">
                  <ArrowRight className="h-8 w-8 text-gray-500 animate-pulse" />
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyzePage;
