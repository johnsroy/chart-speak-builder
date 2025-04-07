
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, MessageSquare, Brain, BrainCircuit, Database } from "lucide-react";
import { nlpService, QueryResult } from '@/services/nlpService';
import { useToast } from '@/hooks/use-toast';
import { dataService } from '@/services/dataService';

interface AIQueryPanelProps {
  datasetId: string;
  onQueryResult: (result: QueryResult) => void;
}

const AIQueryPanel: React.FC<AIQueryPanelProps> = ({
  datasetId,
  onQueryResult
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeModel, setActiveModel] = useState<'openai' | 'anthropic'>('openai');
  const [datasetSchema, setDatasetSchema] = useState<any>(null);
  const [isLoadingSchema, setIsLoadingSchema] = useState(true);
  const [schemaError, setSchemaError] = useState<string | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    const loadDatasetInfo = async () => {
      if (!datasetId) return;
      
      setIsLoadingSchema(true);
      setSchemaError(null);
      
      try {
        console.log(`Loading schema for dataset: ${datasetId}`);
        const dataset = await dataService.getDataset(datasetId);
        
        if (dataset && dataset.column_schema) {
          console.log("Dataset schema loaded:", dataset.column_schema);
          setDatasetSchema(dataset.column_schema);
        } else {
          console.warn("Dataset found but schema is missing:", dataset);
          setSchemaError("Dataset schema is unavailable");
        }
      } catch (error) {
        console.error('Error loading dataset schema:', error);
        setSchemaError(`Failed to load dataset schema: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsLoadingSchema(false);
      }
    };
    
    loadDatasetInfo();
  }, [datasetId]);

  const handleQuerySubmit = async () => {
    if (!query.trim()) {
      toast({
        title: "Query is empty",
        description: "Please enter a question about your data.",
        variant: "destructive"
      });
      return;
    }
    
    if (schemaError) {
      toast({
        title: "Dataset issue",
        description: "There was a problem with your dataset. Please try uploading it again.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log(`Processing query for dataset: ${datasetId} using model: ${activeModel}`);
      // Use processQuery method from nlpService
      const result = await nlpService.processQuery(query, datasetId, activeModel);
      onQueryResult(result);
      toast({
        title: "Query processed successfully",
        description: "Check out the visualization below."
      });
    } catch (error) {
      console.error('Error processing query:', error);
      toast({
        title: "Error processing query",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateSuggestedQuery = () => {
    if (!datasetSchema) return "Tell me about this dataset";
    const columns = Object.keys(datasetSchema);
    if (columns.length === 0) return "Analyze this dataset";

    // Check for common columns to generate more meaningful suggestions
    const hasCategoricalColumn = columns.some(col => datasetSchema[col] === 'string' || col.toLowerCase().includes('category') || col.toLowerCase().includes('type'));
    const hasDateColumn = columns.some(col => datasetSchema[col] === 'date' || col.toLowerCase().includes('date') || col.toLowerCase().includes('year'));
    const hasNumericColumn = columns.some(col => datasetSchema[col] === 'number' || datasetSchema[col] === 'integer');

    // Generate relevant query based on schema
    if (hasCategoricalColumn && hasNumericColumn) {
      const categoryCol = columns.find(col => datasetSchema[col] === 'string' || col.toLowerCase().includes('category') || col.toLowerCase().includes('type'));
      return `Show me a breakdown by ${categoryCol || 'category'}`;
    } else if (hasDateColumn && hasNumericColumn) {
      return "Show me trends over time";
    } else if (hasNumericColumn) {
      return "What are the key statistics of this dataset?";
    } else {
      return "Summarize this dataset";
    }
  };

  // Display error state if schema loading fails
  if (schemaError && !isLoadingSchema) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-xl font-medium text-pink-300">Dataset Error</CardTitle>
          <CardDescription className="text-purple-50">
            There was a problem loading your dataset
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-red-900/30 border-red-500/40">
            <Database className="h-4 w-4 text-red-400" />
            <AlertTitle>Dataset Error</AlertTitle>
            <AlertDescription>
              {schemaError}. Please try refreshing the page or uploading your dataset again.
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex justify-center">
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()} 
              className="bg-red-900/20 hover:bg-red-900/30 text-white border-red-500/40"
            >
              Retry Loading Dataset
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-xl font-medium text-pink-300">Ask Your Data</CardTitle>
        <CardDescription className="text-purple-50">
          Use natural language to query your dataset and generate visualizations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={activeModel} onValueChange={value => setActiveModel(value as 'openai' | 'anthropic')}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="openai" className="flex items-center">
              <Brain className="w-4 h-4 mr-2" />
              OpenAI GPT-4o
            </TabsTrigger>
            <TabsTrigger value="anthropic" className="flex items-center">
              <BrainCircuit className="w-4 h-4 mr-2" />
              Claude 3.7 Sonnet
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="openai">
            <Alert className="mb-4">
              <AlertTitle>Using OpenAI GPT-4o</AlertTitle>
              <AlertDescription>
                GPT-4o is optimized for data analysis with strong visualization capabilities.
              </AlertDescription>
            </Alert>
          </TabsContent>
          
          <TabsContent value="anthropic">
            <Alert className="mb-4">
              <AlertTitle>Using Anthropic Claude 3.7 Sonnet</AlertTitle>
              <AlertDescription>
                Claude 3.7 Sonnet is excellent at understanding complex data relationships.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

        <div className="flex items-center space-x-2">
          <div className="relative flex-grow">
            <Input 
              type="text" 
              placeholder={isLoadingSchema ? "Loading dataset..." : generateSuggestedQuery()} 
              value={query} 
              onChange={e => setQuery(e.target.value)} 
              className="pr-10 bg-gray-950/50 border-purple-500/30 focus:border-purple-500" 
              disabled={isLoading || isLoadingSchema}
              onKeyPress={e => {
                if (e.key === 'Enter') {
                  handleQuerySubmit();
                }
              }}
            />
            <MessageSquare className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          <Button 
            className="purple-gradient" 
            onClick={handleQuerySubmit} 
            disabled={isLoading || isLoadingSchema}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : isLoadingSchema ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Generate'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>;
};

export default AIQueryPanel;
