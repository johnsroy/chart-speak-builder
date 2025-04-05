
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ChartVisualization from '@/components/ChartVisualization';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, Database } from 'lucide-react';
import { toast } from "sonner";
import AIQueryPanel from '@/components/AIQueryPanel';
import EnhancedVisualization from '@/components/EnhancedVisualization';
import { QueryResult } from '@/services/nlpService';

const Visualize = () => {
  const { datasetId } = useParams<{ datasetId: string }>();
  const [dataset, setDataset] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
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
      try {
        const datasetData = await dataService.getDataset(datasetId);
        setDataset(datasetData);
      } catch (error) {
        console.error('Error loading dataset:', error);
        toast.error("Failed to load dataset");
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    loadDataset();
  }, [datasetId, navigate]);

  const handleQueryResult = (result: QueryResult) => {
    setQueryResult(result);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-purple-900 to-blue-900 text-white">
      <div className="container mx-auto py-8">
        <Button 
          variant="ghost" 
          className="mb-6 flex items-center text-gray-300 hover:text-white"
          onClick={() => navigate('/dashboard')}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
          </div>
        ) : dataset ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gradient">{dataset.name}</h1>
              <p className="text-gray-300">{dataset.file_name} • {(dataset.file_size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-3">
                <AIQueryPanel 
                  datasetId={datasetId!} 
                  onQueryResult={handleQueryResult} 
                />
              </div>
              
              <div className="md:col-span-3">
                {queryResult ? (
                  <EnhancedVisualization result={queryResult} />
                ) : (
                  <div className="glass-card p-6">
                    <ChartVisualization datasetId={datasetId!} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-card p-12 text-center">
            <Database className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-medium mb-2">Dataset Not Found</h2>
            <p className="text-gray-400 mb-6">The dataset you're looking for doesn't exist or you don't have permission to view it.</p>
            <Button onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Visualize;
