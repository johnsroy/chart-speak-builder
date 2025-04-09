
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { dataService } from '@/services/dataService';
import { queryService } from '@/services/queryService';
import ChatContainer from './chat/ChatContainer';
import ModelSelector from './chat/ModelSelector';
import ChatInput from './chat/ChatInput';
import { AIModelType, Message } from './chat/types';
import { QueryResult } from '@/services/types/queryTypes';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatUtils } from './chat/ChatUtils';
import { datasetUtils } from '@/utils/datasetUtils';
import { v4 as uuidv4 } from 'uuid';
import { nlpService } from '@/services/nlpService';

interface DatasetChatInterfaceProps {
  datasetId: string;
  datasetName?: string;
  onVisualizationChange?: (vizData: QueryResult) => void;
  hasFullHeightLayout?: boolean;
}

// Maximum token size significantly increased
const MAX_TOKENS = 20000; // 10x increase from previous value

const DatasetChatInterface: React.FC<DatasetChatInterfaceProps> = ({ 
  datasetId,
  datasetName = 'Dataset',
  onVisualizationChange,
  hasFullHeightLayout = false
}) => {
  const defaultExampleQuery = `What insights can you find in this ${datasetName} dataset?`;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: uuidv4(),
      sender: 'ai',
      content: `I'm analyzing the ${datasetName} dataset. Ask me anything about it!`,
      timestamp: new Date()
    }
  ]);
  const [currentModel, setCurrentModel] = useState<AIModelType>('openai');
  const [isLoading, setIsLoading] = useState(false);
  const [fullData, setFullData] = useState<any[]>([]);
  const [loadingState, setLoadingState] = useState({
    isLoading: false,
    message: ''
  });
  const [datasetLoadFailed, setDatasetLoadFailed] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [datasetInfo, setDatasetInfo] = useState<any>(null);
  const [dataAnalysis, setDataAnalysis] = useState<Record<string, any>>({});
  const navigate = useNavigate();

  const handleSetQuery = (query: string) => {
    toast.info(`Selected example query: "${query}"`);
  };

  const loadDataset = useCallback(async (forceRefresh = false) => {
    if (!datasetId) return;
    
    setLoadingState({
      isLoading: true,
      message: 'Loading complete dataset...'
    });
    
    try {
      console.log("Loading full dataset for chat analysis:", datasetId, forceRefresh ? "(forced refresh)" : "");
      
      // First attempt: Use datasetUtils with maximum row limit
      try {
        const datasetRows = await datasetUtils.loadDatasetContent(datasetId, {
          showToasts: false,
          forceRefresh: forceRefresh,
          limitRows: 100000 // Increased to load more rows for better analysis
        });
        
        if (datasetRows && Array.isArray(datasetRows) && datasetRows.length > 0) {
          console.log(`Dataset loaded: ${datasetRows.length} rows available for chat analysis`);
          setFullData(datasetRows);
          
          // Analyze the dataset to understand structure
          const analysis = nlpService.analyzeDataset(datasetRows);
          console.log("Dataset analysis:", analysis);
          setDataAnalysis(analysis);
          
          // Generate recommendations if we have dataset info
          if (datasetInfo) {
            try {
              const dynamicRecommendations = nlpService.getRecommendationsForDataset(datasetInfo, datasetRows);
              setRecommendations(dynamicRecommendations);
            } catch (recError) {
              console.error("Error generating recommendations:", recError);
              // Set default recommendations if custom ones fail
              setRecommendations([
                "Show the distribution of values",
                "What insights can you find?",
                "Summarize this dataset"
              ]);
            }
          }
          
          toast.success(`Full dataset loaded: ${datasetRows.length} rows available for analysis`);
          setDatasetLoadFailed(false);
          return;
        }
      } catch (primaryError) {
        console.error("Primary data loading method failed:", primaryError);
      }
      
      // Second attempt: Direct database query via queryService
      try {
        const directData = await queryService.loadDataset(datasetId);
        if (directData && Array.isArray(directData) && directData.length > 0) {
          console.log(`Successfully loaded ${directData.length} rows directly`);
          setFullData(directData);
          
          const analysis = nlpService.analyzeDataset(directData);
          setDataAnalysis(analysis);
          
          toast.success(`Dataset loaded: ${directData.length} rows available for analysis`);
          setDatasetLoadFailed(false);
          return;
        }
      } catch (directError) {
        console.error("Direct database query failed:", directError);
      }
      
      // Third attempt: Try to get dataset info and create appropriate sample data
      if (datasetInfo) {
        console.log("Generating appropriate sample data based on dataset info");
        let sampleData = [];
        
        // Try to use column schema if available
        if (datasetInfo.column_schema && Object.keys(datasetInfo.column_schema).length > 0) {
          sampleData = generateSampleDataFromSchema(datasetInfo.column_schema, 1000);
        } else if (datasetInfo.file_name) {
          sampleData = generateAppropriateDataFromFilename(datasetInfo.file_name, 1000);
        } else {
          sampleData = generateGenericSampleData(1000);
        }
        
        setFullData(sampleData);
        const analysis = nlpService.analyzeDataset(sampleData);
        setDataAnalysis(analysis);
        
        toast.warning("Using sample data", {
          description: "Couldn't load actual dataset. Using generated sample data for analysis."
        });
        
        // Set basic recommendations
        setRecommendations([
          "What can you tell me about this data?",
          "Show a summary of this dataset",
          "What patterns do you see?",
          "Create a visualization of the key metrics"
        ]);
        
        setDatasetLoadFailed(true);
      } else {
        throw new Error("Failed to load dataset and couldn't generate fallback data");
      }
    } catch (error) {
      console.error("Error loading dataset:", error);
      setDatasetLoadFailed(true);
      setRecommendations([
        "What can you do with datasets?",
        "How can I upload data?",
        "Explain how this interface works"
      ]);
      
      toast.error('Failed to load dataset', {
        description: 'Please try refreshing the page or selecting a different dataset'
      });
    } finally {
      setLoadingState({
        isLoading: false,
        message: ''
      });
    }
  }, [datasetId, datasetInfo]);

  useEffect(() => {
    const loadDatasetInfo = async () => {
      try {
        const dataset = await dataService.getDataset(datasetId);
        setDatasetInfo(dataset);
        
        await loadDataset();
      } catch (error) {
        console.error("Error loading dataset info:", error);
        setDatasetLoadFailed(true);
        toast.error('Failed to load dataset information');
      }
    };
    
    loadDatasetInfo();
  }, [datasetId, loadDataset]);

  const handleSendMessage = async (newMessage: string) => {
    if (!datasetId) {
      toast.error('Dataset ID is required');
      return;
    }

    if (!newMessage || newMessage.trim() === '') {
      toast.error('Message cannot be empty');
      return;
    }

    setIsLoading(true);
    const userMessage: Message = {
      id: uuidv4(),
      sender: 'user',
      content: newMessage,
      timestamp: new Date()
    };
    setMessages(prevMessages => [...prevMessages, userMessage]);

    try {
      // Ensure we have data to analyze
      if (fullData.length === 0) {
        // Try to load data one more time with forced refresh
        setLoadingState({
          isLoading: true,
          message: 'Loading full dataset...'
        });
        
        await loadDataset(true);
        
        if (fullData.length === 0) {
          throw new Error('No data available for analysis. Please check your dataset.');
        }
        
        setLoadingState({
          isLoading: false,
          message: ''
        });
      }
      
      // Add a processing message to show the user we're working on it
      const processingId = uuidv4();
      setMessages(prevMessages => [...prevMessages, {
        id: processingId,
        sender: 'ai',
        content: `Processing your query: "${newMessage}"...`,
        timestamp: new Date(),
        isProcessing: true,
        model: currentModel
      }]);
      
      console.log(`Processing query: "${newMessage}" for dataset ${datasetId} using model ${currentModel}`);
      
      // Create system prompts for better analysis
      const systemPrompt = `You are an AI data analyst specializing in exploring and explaining datasets. 
You're analyzing a dataset with ${fullData.length} rows and the following characteristics:
- Name: ${datasetInfo?.name || 'Unknown'}
- Columns: ${datasetInfo?.column_schema ? Object.keys(datasetInfo.column_schema).join(', ') : 'Unknown'}

When responding:
1. First, THINK STEP BY STEP about what the user is asking and how to approach the analysis
2. Consider what visualizations would be useful (bar charts, line charts, pie charts)
3. Look for patterns, trends, correlations, and interesting insights
4. Include relevant statistics and aggregate data to support your findings
5. Always be specific about what you found in THIS dataset
6. Keep your analysis clear and meaningful, but be comprehensive

The data type of each column: 
${datasetInfo?.column_schema ? Object.entries(datasetInfo.column_schema).map(([key, value]) => `- ${key}: ${value}`).join('\n') : 'Unknown'}

Sample of the dataset (first 3 rows):
${JSON.stringify(fullData.slice(0, 3), null, 2)}`;

      // Generate thinking process first
      const thinkingProcess = `## Analyzing query: "${newMessage}"

### Understanding the Dataset
- Dataset name: ${datasetInfo?.name || 'Unknown'}
- Number of rows: ${fullData.length}
- Columns: ${datasetInfo?.column_schema ? Object.keys(datasetInfo.column_schema).join(', ') : 'Unknown'}

### Approach
1. First, I'll identify what the query is asking for
2. Then, I'll determine which columns/features are relevant
3. I'll analyze the data focusing on these aspects
4. I'll identify patterns, trends, or insights
5. I'll prepare a clear explanation with supporting evidence
6. If appropriate, I'll suggest a visualization approach

### Analysis Steps
Let me explore the data sample...`;

      // Use the NLP service to process the query with the dataset content
      const aiResponse = await nlpService.processQuery(newMessage, datasetId, currentModel, fullData);
      
      // Add model information to the response
      if (aiResponse) {
        aiResponse.model_used = currentModel;
      }

      // Handle case where no visualization data is returned
      if (!aiResponse || (!aiResponse.data || aiResponse.data.length === 0)) {
        // Remove the processing message
        setMessages(prevMessages => prevMessages.filter(m => m.id !== processingId));

        // Create a comprehensive response
        const aiMessage: Message = {
          id: uuidv4(),
          sender: 'ai',
          content: `I analyzed the ${datasetName} dataset based on your query: "${newMessage}"

Based on my analysis, I can tell you that this dataset ${fullData.length > 0 ? `contains ${fullData.length} records` : 'has limited data available'}.

${aiResponse?.explanation || 'I was not able to generate specific insights for your query with the available data. Try asking a more specific question about the dataset.'}

Would you like me to try a different approach to answer your question?`,
          timestamp: new Date(),
          model: currentModel,
          thinking: thinkingProcess
        };
        
        setMessages(prevMessages => [...prevMessages.filter(m => m.id !== processingId), aiMessage]);
      } else {
        // We have visualization data - create a complete response
        const aiMessage: Message = {
          id: uuidv4(),
          sender: 'ai',
          content: aiResponse.explanation || `Here's a visualization based on your query: "${newMessage}"`,
          timestamp: new Date(),
          model: currentModel,
          thinking: thinkingProcess,
          visualization: {
            data: aiResponse.data,
            chartType: aiResponse.chartType || aiResponse.chart_type || 'bar',
            xAxis: aiResponse.xAxis || aiResponse.x_axis || 'Category',
            yAxis: aiResponse.yAxis || aiResponse.y_axis || 'Value',
            title: 'Data Analysis Result',
            stats: {
              count: aiResponse.data.length,
              sum: calculateSum(aiResponse.data, aiResponse.yAxis || aiResponse.y_axis || 'value'),
              avg: calculateAverage(aiResponse.data, aiResponse.yAxis || aiResponse.y_axis || 'value'),
              min: calculateMin(aiResponse.data, aiResponse.yAxis || aiResponse.y_axis || 'value'),
              max: calculateMax(aiResponse.data, aiResponse.yAxis || aiResponse.y_axis || 'value')
            }
          }
        };
        
        setMessages(prevMessages => [...prevMessages.filter(m => m.id !== processingId), aiMessage]);
        
        // Notify any parent components about the visualization
        if (onVisualizationChange && aiResponse.data) {
          onVisualizationChange(aiMessage.visualization!);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Remove the processing message if it exists
      setMessages(prevMessages => prevMessages.filter(m => !m.isProcessing));
      
      // Add an error message
      const errorMessage: Message = {
        id: uuidv4(),
        sender: 'ai',
        content: `I encountered an error while processing your query: "${error instanceof Error ? error.message : 'Unknown error'}"

Please try again with a different query or check that the dataset is properly loaded.`,
        timestamp: new Date(),
        model: currentModel
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
      
      toast.error('Error processing query', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshData = async () => {
    try {
      setLoadingState({
        isLoading: true,
        message: 'Refreshing dataset...'
      });
      
      await loadDataset(true);
      
      toast.success('Dataset refreshed successfully');
    } catch (error) {
      console.error("Error refreshing dataset:", error);
      toast.error('Failed to refresh dataset');
    } finally {
      setLoadingState({
        isLoading: false,
        message: ''
      });
    }
  };
  
  const calculateSum = (data: any[], field: string): number => {
    if (!data || !data.length) return 0;
    return data.reduce((sum, item) => {
      const value = Number(item[field]);
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
  };
  
  const calculateAverage = (data: any[], field: string): number => {
    if (!data || !data.length) return 0;
    const sum = calculateSum(data, field);
    return sum / data.length;
  };
  
  const calculateMin = (data: any[], field: string): number => {
    if (!data || !data.length) return 0;
    const values = data.map(item => Number(item[field])).filter(v => !isNaN(v));
    return values.length ? Math.min(...values) : 0;
  };
  
  const calculateMax = (data: any[], field: string): number => {
    if (!data || !data.length) return 0;
    const values = data.map(item => Number(item[field])).filter(v => !isNaN(v));
    return values.length ? Math.max(...values) : 0;
  };
  
  // Helper function for generating sample data from schema
  const generateSampleDataFromSchema = (schema: Record<string, string>, count: number): any[] => {
    const data = [];
    const fields = Object.keys(schema);
    
    for (let i = 0; i < count; i++) {
      const row: Record<string, any> = {};
      
      fields.forEach(field => {
        const type = schema[field];
        
        switch (type) {
          case 'number':
            row[field] = Math.floor(Math.random() * 1000);
            break;
          case 'boolean':
            row[field] = Math.random() > 0.5;
            break;
          case 'date':
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 365));
            row[field] = date.toISOString().split('T')[0];
            break;
          case 'string':
          default:
            row[field] = `Sample ${field} ${i + 1}`;
            break;
        }
      });
      
      data.push(row);
    }
    
    return data;
  };
  
  // Helper function for generating sample data based on a filename
  const generateAppropriateDataFromFilename = (fileName: string, count: number): any[] => {
    const lowerFileName = fileName.toLowerCase();
    const data = [];
    
    // Generate different sample data depending on the filename
    if (lowerFileName.includes('electric') || lowerFileName.includes('vehicle') || lowerFileName.includes('car')) {
      for (let i = 0; i < count; i++) {
        data.push({
          'VIN': `SAMPLE${i}${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          'County': ['King', 'Pierce', 'Snohomish', 'Thurston', 'Clark'][i % 5],
          'City': ['Seattle', 'Bellevue', 'Tacoma', 'Olympia', 'Vancouver'][i % 5],
          'State': 'WA',
          'Postal Code': 90000 + Math.floor(Math.random() * 10000),
          'Model Year': 2014 + (i % 10),
          'Make': ['Tesla', 'Nissan', 'Chevrolet', 'BMW', 'Ford'][i % 5],
          'Model': ['Model 3', 'Leaf', 'Bolt EV', 'i3', 'Mustang Mach-E'][i % 5],
          'Electric Vehicle Type': i % 3 === 0 ? 'Plug-in Hybrid Electric Vehicle (PHEV)' : 'Battery Electric Vehicle (BEV)',
          'Electric Range': 80 + Math.floor(Math.random() * 320),
          'Base MSRP': 30000 + Math.floor(Math.random() * 70000)
        });
      }
    } else if (lowerFileName.includes('sales') || lowerFileName.includes('revenue')) {
      // Generate sales data
      for (let i = 0; i < count; i++) {
        data.push({
          'Date': new Date(2022, i % 12, i % 28 + 1).toISOString().split('T')[0],
          'Product': ['Product A', 'Product B', 'Product C', 'Product D', 'Product E'][i % 5],
          'Category': ['Electronics', 'Clothing', 'Home', 'Sports', 'Books'][i % 5],
          'Revenue': 1000 + Math.floor(Math.random() * 9000),
          'Quantity': 1 + Math.floor(Math.random() * 50),
          'Region': ['North', 'South', 'East', 'West', 'Central'][i % 5]
        });
      }
    } else {
      // Generic dataset
      for (let i = 0; i < count; i++) {
        data.push({
          'id': i + 1,
          'Category': ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'][i % 5],
          'Value': Math.floor(Math.random() * 1000),
          'Date': new Date(2022, i % 12, i % 28 + 1).toISOString().split('T')[0]
        });
      }
    }
    
    return data;
  };
  
  // Helper function for generating generic sample data
  const generateGenericSampleData = (count: number): any[] => {
    const data = [];
    
    for (let i = 0; i < count; i++) {
      data.push({
        'id': i + 1,
        'name': `Item ${i + 1}`,
        'category': ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'][i % 5],
        'value': Math.floor(Math.random() * 1000),
        'date': new Date(2022, i % 12, i % 28 + 1).toISOString().split('T')[0]
      });
    }
    
    return data;
  };

  return (
    <div className={`flex flex-col ${hasFullHeightLayout ? 'h-full' : 'h-[calc(100vh-8rem)]'} lg:gap-4`}>
      {loadingState.isLoading ? (
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
          <p className="text-lg text-gray-300">{loadingState.message || 'Loading...'}</p>
        </div>
      ) : datasetLoadFailed ? (
        <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center space-y-6">
          <AlertTriangle className="h-16 w-16 text-yellow-500" />
          <h3 className="text-xl font-semibold">Dataset Loading Issue</h3>
          <p className="text-gray-400">
            There was an issue loading the complete dataset. I'm using sample data for analysis, but results may not reflect your actual data.
          </p>
          <Button onClick={handleRefreshData} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col lg:flex-row justify-between gap-4 mb-4">
            <div className="flex flex-col">
              <h2 className="text-xl font-semibold mb-1">
                {datasetInfo?.name || datasetName}
              </h2>
              <p className="text-sm text-gray-400">
                {fullData.length > 0 ? `${fullData.length.toLocaleString()} rows available for analysis` : 'No data available'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleRefreshData}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Data
              </Button>
              <ModelSelector 
                currentModel={currentModel} 
                setCurrentModel={setCurrentModel} 
              />
            </div>
          </div>
          
          <ChatContainer 
            messages={messages} 
            downloadVisualization={onVisualizationChange || (() => {})} 
            datasetId={datasetId} 
          />
          
          <ChatInput 
            onSendMessage={handleSendMessage} 
            isLoading={isLoading}
            suggestions={recommendations}
            onSuggestionSelect={handleSetQuery}
            placeholder={defaultExampleQuery}
          />
        </>
      )}
    </div>
  );
};

export default DatasetChatInterface;
