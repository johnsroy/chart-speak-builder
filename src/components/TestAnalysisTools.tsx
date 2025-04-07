
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { mockSupabaseClient, testNLPQuery, testDataQuery, processUploadedFile } from '@/utils/test/mockServices';
import { setupMockSupabaseFunctions, restoreMockSupabaseFunctions } from '@/utils/test/mockServices';
import { Loader2, Send, BarChart, LineChart, PieChart, UploadCloud, FileText, RefreshCw } from 'lucide-react';
import EnhancedVisualization from './EnhancedVisualization';
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const TestAnalysisTools = () => {
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [queryResult, setQueryResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>('test-nlp');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [activeModel, setActiveModel] = useState<'openai' | 'anthropic'>('openai');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processedData, setProcessedData] = useState<any[] | null>(null);
  const [dataColumns, setDataColumns] = useState<string[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState<boolean>(false);
  
  // Set up mock services for testing
  useEffect(() => {
    console.log('Setting up mock Supabase functions for testing');
    setupMockSupabaseFunctions();
    
    return () => {
      console.log('Restoring original Supabase functions');
      restoreMockSupabaseFunctions();
    };
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    const file = event.target.files[0];
    setUploadedFile(file);
    setDebugInfo(`File selected: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
    
    // Process the uploaded file
    setIsProcessingFile(true);
    try {
      const data = await processUploadedFile(file);
      setProcessedData(data);
      
      if (data.length > 0) {
        setDataColumns(Object.keys(data[0]));
        setDebugInfo(`File processed successfully: ${data.length} rows, ${Object.keys(data[0]).length} columns`);
        toast.success("File processed successfully", {
          description: `${data.length} rows loaded for analysis`
        });
      } else {
        setDebugInfo('File processed but no data found');
        toast.warning("No data found in file");
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setDebugInfo(`Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error("Error processing file", {
        description: error instanceof Error ? error.message : "Failed to process the file"
      });
    } finally {
      setIsProcessingFile(false);
    }
  };

  const handleNLPQuery = async () => {
    if (!inputText.trim()) {
      toast.error("Please enter a query");
      return;
    }
    
    setIsLoading(true);
    setDebugInfo('Processing NLP query...');
    
    try {
      console.log(`Sending NLP query: "${inputText}" with processed data:`, processedData?.length || 0);
      // Use uploaded data if available, otherwise use sample data
      const result = await testNLPQuery(inputText, processedData);
      console.log('NLP query result:', result);
      
      setQueryResult(result);
      setDebugInfo(`Query successful! Chart type: ${result.chart_type || 'unknown'}`);
    } catch (error) {
      console.error('Error processing NLP query:', error);
      setDebugInfo(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error("Error analyzing data", {
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresetQuery = async (queryType: string) => {
    setIsLoading(true);
    setDebugInfo(`Running preset ${queryType} query...`);
    
    try {
      // Use uploaded data if available, otherwise use sample data
      const result = await testDataQuery(queryType, processedData);
      console.log(`${queryType} query result:`, result);
      
      setQueryResult(result);
      setDebugInfo(`Preset query successful! Chart type: ${result.chart_type || 'unknown'}`);
    } catch (error) {
      console.error(`Error with ${queryType} query:`, error);
      setDebugInfo(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error("Error with preset query", {
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleNLPQuery();
    }
  };

  const clearData = () => {
    setUploadedFile(null);
    setProcessedData(null);
    setDataColumns([]);
    setQueryResult(null);
    setDebugInfo('Data cleared');
    toast.info("Data and results cleared");
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Test Analysis Tools</h1>
      
      {/* File upload section */}
      <Card className="mb-6 border border-purple-500/30 bg-black/50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Upload Data for Testing
            {processedData && (
              <Badge variant="outline" className="ml-2 bg-green-900/50">
                {processedData.length} rows
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input 
              type="file" 
              onChange={handleFileUpload} 
              accept=".csv,.xlsx,.xls,.json"
              disabled={isProcessingFile}
              className="flex-1"
            />
            <Button 
              variant="outline" 
              disabled={isProcessingFile}
              className="bg-violet-900 hover:bg-violet-800"
            >
              {isProcessingFile ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <UploadCloud className="h-4 w-4 mr-2" />
              )}
              {isProcessingFile ? 'Processing...' : 'Upload'}
            </Button>

            {processedData && (
              <Button 
                variant="outline" 
                onClick={clearData}
                className="bg-red-900/50 hover:bg-red-800"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
          
          {uploadedFile && (
            <div className="text-sm">
              <p>File: <span className="font-medium">{uploadedFile.name}</span> ({(uploadedFile.size / 1024).toFixed(2)} KB)</p>
              {processedData && (
                <p>Rows: <span className="font-medium">{processedData.length}</span> | 
                   Columns: <span className="font-medium">{dataColumns.length}</span></p>
              )}
              {dataColumns.length > 0 && (
                <div className="mt-2">
                  <p className="font-medium">Available columns:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {dataColumns.map((column) => (
                      <span key={column} className="inline-block px-2 py-1 rounded-full text-xs bg-violet-900/50">
                        {column}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="test-nlp">Test NLP Queries</TabsTrigger>
          <TabsTrigger value="test-presets">Test Preset Visualizations</TabsTrigger>
        </TabsList>
        
        <TabsContent value="test-nlp" className="space-y-4">
          <Card className="border border-purple-500/30 bg-black/50">
            <CardHeader>
              <CardTitle>Natural Language Queries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Button 
                  variant={activeModel === 'openai' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setActiveModel('openai')}
                >
                  OpenAI
                </Button>
                <Button 
                  variant={activeModel === 'anthropic' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setActiveModel('anthropic')}
                  className="bg-amber-600 hover:bg-amber-500"
                >
                  Claude
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Input 
                  value={inputText} 
                  onChange={e => setInputText(e.target.value)} 
                  onKeyDown={handleKeyPress} 
                  placeholder={processedData ? "Ask a question about your data..." : "Upload data first or try a sample query"} 
                  disabled={isLoading} 
                  className="flex-1" 
                />
                <Button 
                  onClick={handleNLPQuery} 
                  disabled={isLoading || !inputText.trim()} 
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-4">
                {dataColumns.length > 0 ? (
                  // Dynamic query suggestions based on data columns
                  <>
                    {dataColumns.some(col => typeof col === 'string' && col.toLowerCase().includes('sales')) && (
                      <Button variant="outline" size="sm" onClick={() => setInputText("Show sales trends")}>
                        Show sales trends
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setInputText(`Compare ${dataColumns[0]} distribution`)}>
                      Compare {dataColumns[0]} distribution
                    </Button>
                    {dataColumns.length > 1 && (
                      <Button variant="outline" size="sm" onClick={() => setInputText(`Show ${dataColumns[1]} by ${dataColumns[0]}`)}>
                        Show {dataColumns[1]} by {dataColumns[0]}
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setInputText("Create a pie chart")}>
                      Create a pie chart
                    </Button>
                  </>
                ) : (
                  // Default query suggestions
                  ['Show sales by region', 'Compare monthly trends', 'What are the top products?', 'Show distribution by category'].map((query) => (
                    <Button 
                      key={query}
                      variant="outline" 
                      size="sm"
                      onClick={() => setInputText(query)}
                    >
                      {query}
                    </Button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="test-presets" className="space-y-4">
          <Card className="border border-purple-500/30 bg-black/50">
            <CardHeader>
              <CardTitle>Preset Visualizations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => handlePresetQuery('barChart')} disabled={isLoading} className="bg-violet-700 hover:bg-violet-600">
                  <BarChart className="h-4 w-4 mr-2" /> Bar Chart
                </Button>
                <Button onClick={() => handlePresetQuery('lineChart')} disabled={isLoading} className="bg-blue-700 hover:bg-blue-600">
                  <LineChart className="h-4 w-4 mr-2" /> Line Chart
                </Button>
                <Button onClick={() => handlePresetQuery('pieChart')} disabled={isLoading} className="bg-amber-700 hover:bg-amber-600">
                  <PieChart className="h-4 w-4 mr-2" /> Pie Chart
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="mb-4 p-4 bg-gray-800/50 rounded-md border border-gray-700">
        <h3 className="text-sm font-medium mb-2">Debug Info:</h3>
        <pre className="text-xs text-gray-300 whitespace-pre-wrap">{debugInfo}</pre>
      </div>
      
      {queryResult && (
        <Card className="mt-4 border border-purple-500/30 bg-black/50">
          <CardHeader>
            <CardTitle>
              {queryResult.chart_title || 'Visualization Result'}
            </CardTitle>
            {queryResult.explanation && (
              <p className="text-sm text-gray-300">{queryResult.explanation}</p>
            )}
          </CardHeader>
          <CardContent>
            <EnhancedVisualization result={queryResult} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TestAnalysisTools;
