
import React, { useState, useEffect } from 'react';
import NavBar from '@/components/NavBar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { dataService } from '@/services/dataService';
import { nlpService } from '@/services/nlpService';
import { useAuth } from '@/hooks/useAuth';
import { BarChart, LineChart, PieChart, ScatterPlot } from 'lucide-react';
import Footer from '@/components/Footer';

const Dashboard = () => {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [queryResult, setQueryResult] = useState<any>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const loadDatasets = async () => {
      try {
        const userDatasets = await dataService.getDatasets();
        setDatasets(userDatasets);
        if (userDatasets.length > 0) {
          setSelectedDataset(userDatasets[0].id);
        }
      } catch (error) {
        console.error('Error loading datasets:', error);
        toast({
          title: 'Error loading datasets',
          description: 'Failed to load your datasets. Please try again.',
          variant: 'destructive',
        });
      }
    };
    
    loadDatasets();
  }, [toast]);

  const handleQuerySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDataset) {
      toast({
        title: 'No dataset selected',
        description: 'Please select a dataset first.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!query.trim()) {
      toast({
        title: 'Empty query',
        description: 'Please enter a query to analyze your data.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsProcessing(true);
    try {
      const result = await nlpService.processQuery(query, selectedDataset);
      setQueryResult(result);
    } catch (error) {
      console.error('Error processing query:', error);
      toast({
        title: 'Query error',
        description: 'Failed to process your query. Please try a different question.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getSelectedDatasetName = () => {
    const dataset = datasets.find(d => d.id === selectedDataset);
    return dataset ? dataset.name : 'Select a dataset';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-purple-900 to-blue-900 text-white">
      <NavBar />
      
      <main className="container mx-auto py-8 px-4">
        <div className="glass-card p-6 mb-8">
          <h1 className="text-2xl font-bold mb-4">Welcome, {user?.name || 'User'}!</h1>
          <p className="text-muted-foreground">
            Ask questions about your data using natural language or create visualizations manually.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar with datasets */}
          <div className="glass-card p-6">
            <h2 className="text-xl font-bold mb-4">Your Datasets</h2>
            
            {datasets.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No datasets found</p>
                <Button onClick={() => window.location.href = '/upload'}>
                  Upload a Dataset
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {datasets.map(dataset => (
                  <button
                    key={dataset.id}
                    className={`w-full text-left p-3 rounded-lg transition ${
                      selectedDataset === dataset.id 
                        ? 'bg-primary text-white'
                        : 'hover:bg-white/10'
                    }`}
                    onClick={() => setSelectedDataset(dataset.id)}
                  >
                    <div className="font-medium">{dataset.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {dataset.row_count} rows • {Object.keys(dataset.column_schema).length} columns
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {/* Main content area */}
          <div className="lg:col-span-2">
            <div className="glass-card p-6 mb-8">
              <form onSubmit={handleQuerySubmit}>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="bg-white/20 px-3 py-2 rounded-lg">
                    {getSelectedDatasetName()}
                  </div>
                  <span>→</span>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Ask a question about your data..."
                  />
                  <Button type="submit" disabled={isProcessing || !selectedDataset}>
                    {isProcessing ? 'Processing...' : 'Ask'}
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Try: "What were my total sales each month?" or "Show me the distribution of products by category"
                </div>
              </form>
            </div>
            
            {/* Results area */}
            {queryResult && (
              <div className="glass-card p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold">{queryResult.chartConfig.title}</h2>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className={queryResult.chartType === 'bar' ? 'bg-primary' : ''}>
                      <BarChart className="h-4 w-4 mr-1" /> Bar
                    </Button>
                    <Button variant="outline" size="sm" className={queryResult.chartType === 'line' ? 'bg-primary' : ''}>
                      <LineChart className="h-4 w-4 mr-1" /> Line
                    </Button>
                    <Button variant="outline" size="sm" className={queryResult.chartType === 'pie' ? 'bg-primary' : ''}>
                      <PieChart className="h-4 w-4 mr-1" /> Pie
                    </Button>
                    <Button variant="outline" size="sm" className={queryResult.chartType === 'scatter' ? 'bg-primary' : ''}>
                      <ScatterPlot className="h-4 w-4 mr-1" /> Scatter
                    </Button>
                  </div>
                </div>
                
                <div className="bg-white/10 rounded-lg p-4 h-80 flex items-center justify-center">
                  {/* This is where we would implement the chart rendering */}
                  {/* For now, we'll just show a placeholder */}
                  <div className="text-center">
                    <p className="mb-2">Visualization would render here</p>
                    <p className="text-sm text-muted-foreground">Chart type: {queryResult.chartType}</p>
                    <p className="text-sm text-muted-foreground">
                      X-axis: {queryResult.chartConfig.xAxis}, Y-axis: {queryResult.chartConfig.yAxis}
                    </p>
                    <p className="text-sm text-muted-foreground mt-4">
                      Data points: {queryResult.data.length}
                    </p>
                  </div>
                </div>
                
                {queryResult.explanation && (
                  <div className="mt-4 p-4 bg-white/5 rounded-lg">
                    <h3 className="font-medium mb-2">Analysis</h3>
                    <p>{queryResult.explanation}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
