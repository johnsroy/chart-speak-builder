
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, LineChart, PieChart, MessageSquare } from 'lucide-react';
import EnhancedVisualization from './EnhancedVisualization';
import { QueryResult } from '@/services/queryService';
import { setupMockSupabaseFunctions, restoreMockSupabaseFunctions, testDataQuery, testNLPQuery } from '@/utils/test/mockServices';
import { sampleQueries } from '@/utils/test/sampleData';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';

export default function TestAnalysisTools() {
  const [activeTab, setActiveTab] = useState('bar');
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, QueryResult | null>>({
    bar: null,
    pie: null,
    line: null,
    nlp: null
  });
  const [nlpQuery, setNlpQuery] = useState("Show me sales by product category");
  const [mockEnabled, setMockEnabled] = useState(false);

  // Enable/disable mocking
  useEffect(() => {
    if (mockEnabled) {
      setupMockSupabaseFunctions();
    } else {
      restoreMockSupabaseFunctions();
    }
    
    // Cleanup on unmount
    return () => {
      restoreMockSupabaseFunctions();
    };
  }, [mockEnabled]);

  // Run query test
  const runQueryTest = async (queryType: string) => {
    setIsLoading(true);
    
    try {
      const result = await testDataQuery(queryType);
      setTestResults(prev => ({
        ...prev,
        [queryType]: result
      }));
      
      toast({
        title: "Test completed",
        description: `${queryType} chart query test successful`,
      });
    } catch (error) {
      console.error(`Test error for ${queryType}:`, error);
      
      toast({
        title: "Test failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Run NLP query test
  const runNLPTest = async () => {
    setIsLoading(true);
    
    try {
      const result = await testNLPQuery(nlpQuery);
      setTestResults(prev => ({
        ...prev,
        nlp: result
      }));
      
      toast({
        title: "NLP test completed",
        description: "Natural language query test successful",
      });
    } catch (error) {
      console.error("NLP test error:", error);
      
      toast({
        title: "NLP test failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get test status message
  const getTestStatus = (queryType: string) => {
    const result = testResults[queryType];
    
    if (!result) {
      return "Test not run";
    }
    
    if (result.error) {
      return `Test failed: ${result.error}`;
    }
    
    return "Test passed";
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Analysis Tools Test</h1>
        <div className="flex items-center">
          <label htmlFor="mockToggle" className="mr-2">
            Use Mock Data
          </label>
          <input
            id="mockToggle"
            type="checkbox"
            checked={mockEnabled}
            onChange={() => setMockEnabled(!mockEnabled)}
            className="toggle"
          />
        </div>
      </div>
      
      <Tabs defaultValue="bar" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="bar" disabled={isLoading} className="flex items-center gap-2">
            <BarChart className="h-4 w-4" /> Bar Chart
          </TabsTrigger>
          <TabsTrigger value="pie" disabled={isLoading} className="flex items-center gap-2">
            <PieChart className="h-4 w-4" /> Pie Chart
          </TabsTrigger>
          <TabsTrigger value="line" disabled={isLoading} className="flex items-center gap-2">
            <LineChart className="h-4 w-4" /> Line Chart
          </TabsTrigger>
          <TabsTrigger value="nlp" disabled={isLoading} className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> NL Query
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="bar" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Bar Chart Test</CardTitle>
              <CardDescription>
                Tests the bar chart visualization using the query builder.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <strong>Test Configuration:</strong>
                <pre className="bg-gray-800 p-4 mt-2 rounded-md overflow-auto text-xs">
                  {JSON.stringify(sampleQueries.barChart, null, 2)}
                </pre>
              </div>
              
              <div className="mb-4">
                <strong>Status:</strong> {getTestStatus('bar')}
              </div>
              
              {testResults.bar && !testResults.bar.error && (
                <EnhancedVisualization result={testResults.bar} />
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => runQueryTest('barChart')} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading && activeTab === 'bar' ? 'Running Test...' : 'Run Bar Chart Test'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="pie" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Pie Chart Test</CardTitle>
              <CardDescription>
                Tests the pie chart visualization using the query builder.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <strong>Test Configuration:</strong>
                <pre className="bg-gray-800 p-4 mt-2 rounded-md overflow-auto text-xs">
                  {JSON.stringify(sampleQueries.pieChart, null, 2)}
                </pre>
              </div>
              
              <div className="mb-4">
                <strong>Status:</strong> {getTestStatus('pie')}
              </div>
              
              {testResults.pie && !testResults.pie.error && (
                <EnhancedVisualization result={testResults.pie} />
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => runQueryTest('pieChart')} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading && activeTab === 'pie' ? 'Running Test...' : 'Run Pie Chart Test'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="line" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Line Chart Test</CardTitle>
              <CardDescription>
                Tests the line chart visualization using the query builder.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <strong>Test Configuration:</strong>
                <pre className="bg-gray-800 p-4 mt-2 rounded-md overflow-auto text-xs">
                  {JSON.stringify(sampleQueries.lineChart, null, 2)}
                </pre>
              </div>
              
              <div className="mb-4">
                <strong>Status:</strong> {getTestStatus('line')}
              </div>
              
              {testResults.line && !testResults.line.error && (
                <EnhancedVisualization result={testResults.line} />
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => runQueryTest('lineChart')} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading && activeTab === 'line' ? 'Running Test...' : 'Run Line Chart Test'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="nlp" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Natural Language Query Test</CardTitle>
              <CardDescription>
                Tests the AI-powered natural language query processing.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <label className="block mb-2">Test Query:</label>
                <div className="flex gap-2">
                  <Input
                    value={nlpQuery}
                    onChange={(e) => setNlpQuery(e.target.value)}
                    className="flex-1"
                    placeholder="Enter a natural language query..."
                    disabled={isLoading}
                  />
                  <Button
                    size="sm"
                    onClick={() => setNlpQuery("Show me sales by product category")}
                    variant="outline"
                    disabled={isLoading}
                  >
                    Reset
                  </Button>
                </div>
              </div>
              
              <div className="mb-4">
                <strong>Status:</strong> {getTestStatus('nlp')}
              </div>
              
              {testResults.nlp && !testResults.nlp.error && (
                <EnhancedVisualization result={testResults.nlp} />
              )}
              
              {testResults.nlp && testResults.nlp.explanation && (
                <div className="mt-4 p-3 bg-blue-950/30 border border-blue-500/20 rounded-md">
                  <h3 className="text-sm font-medium mb-1">AI Explanation:</h3>
                  <p className="text-sm">{testResults.nlp.explanation}</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={runNLPTest} 
                disabled={isLoading}
                className="w-full"
              >
                {isLoading && activeTab === 'nlp' ? 'Running Test...' : 'Run NLP Test'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
