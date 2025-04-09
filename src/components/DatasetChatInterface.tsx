
import React, { useState, useEffect } from 'react';
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
  }, [datasetId]);
  
  const loadDataset = async () => {
    if (!datasetId) return;
    
    setLoadingState({
      isLoading: true,
      message: 'Loading dataset content...'
    });
    
    try {
      console.log("Loading dataset for chat:", datasetId);
      
      // First attempt: Use datasetUtils with multiple fallback mechanisms
      try {
        const datasetRows = await datasetUtils.loadDatasetContent(datasetId, {
          showToasts: false,
          limitRows: 5000  // Increased row limit for better analysis
        });
        
        if (datasetRows && Array.isArray(datasetRows) && datasetRows.length > 0) {
          console.log(`Dataset loaded: ${datasetRows.length} rows available for chat`);
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
          
          toast.success(`Dataset loaded: ${datasetRows.length} rows available for analysis`);
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
          sampleData = generateSampleDataFromSchema(datasetInfo.column_schema, 100);
        } else if (datasetInfo.file_name) {
          sampleData = generateAppropriateDataFromFilename(datasetInfo.file_name, 100);
        } else {
          sampleData = generateGenericSampleData(100);
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
  };

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
        // Try to load data one more time
        setLoadingState({
          isLoading: true,
          message: 'Loading dataset content...'
        });
        
        const datasetRows = await datasetUtils.loadDatasetContent(datasetId, {
          showToasts: false,
          forceRefresh: true,
          limitRows: 5000  // Increased row limit for better analysis
        });
        
        if (datasetRows && Array.isArray(datasetRows) && datasetRows.length > 0) {
          setFullData(datasetRows);
          
          // Analyze the dataset to update our recommendations
          const analysis = nlpService.analyzeDataset(datasetRows);
          setDataAnalysis(analysis);
          
          // Generate custom recommendations based on actual data
          if (datasetInfo) {
            const dynamicRecommendations = nlpService.getRecommendationsForDataset(datasetInfo, datasetRows);
            setRecommendations(dynamicRecommendations);
          }
          
          toast.success(`Dataset loaded: ${datasetRows.length} rows available for analysis`);
        } else {
          // Fetch dataset info to generate sample data
          const dataset = await dataService.getDataset(datasetId);
          if (dataset && dataset.file_name) {
            const sampleData = generateAppropriateDataFromFilename(dataset.file_name, 1000);
            setFullData(sampleData);
            
            // Even with sample data, analyze and generate recommendations
            const analysis = nlpService.analyzeDataset(sampleData);
            setDataAnalysis(analysis);
            const dynamicRecommendations = nlpService.getRecommendationsForDataset(dataset, sampleData);
            setRecommendations(dynamicRecommendations);
            
            toast.info("Using generated sample data for analysis");
          } else {
            throw new Error('No data available for analysis. Please check your dataset.');
          }
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
        isProcessing: true
      }]);
      
      // Use the NLP service to process the query with the dataset content
      const aiResponse = await nlpService.processQuery(newMessage, datasetId, currentModel, fullData);
      
      // Add model information to the response
      if (aiResponse) {
        aiResponse.model_used = currentModel;
      }

      if (aiResponse && (!aiResponse.data || aiResponse.data.length === 0)) {
        // Generate fallback visualization if no data was returned
        const fallbackMessage: Message = {
          id: uuidv4(),
          sender: 'ai',
          content: `I couldn't generate a visualization for that query. Let me try a different approach...`,
          timestamp: new Date()
        };
        
        // Remove the processing message and add the fallback message
        setMessages(prevMessages => prevMessages.filter(m => m.id !== processingId).concat(fallbackMessage));
        
        // Try using a simpler approach
        const dataset = await dataService.getDataset(datasetId);
        const recommendations = nlpService.getRecommendationsForDataset(dataset, fullData);
        const fallbackQuery = recommendations[0] || "Show the distribution of values";
        
        // Try the fallback query
        const fallbackResponse = await nlpService.processQuery(fallbackQuery, datasetId, currentModel, fullData);
        
        if (fallbackResponse && fallbackResponse.data && fallbackResponse.data.length > 0) {
          fallbackResponse.explanation = `I couldn't visualize "${newMessage}" directly, so I'm showing ${fallbackResponse.explanation?.toLowerCase() || 'some basic statistics about your data'}.`;
          fallbackResponse.model_used = currentModel;
          
          const aiMessage: Message = {
            id: uuidv4(),
            sender: 'ai',
            content: fallbackResponse.explanation,
            timestamp: new Date(),
            result: fallbackResponse,
            model: currentModel
          };
          
          // Replace the fallback message with the response
          setMessages(prevMessages => [...prevMessages.filter(m => m.id !== fallbackMessage.id), aiMessage]);
          
          if (onVisualizationChange) {
            onVisualizationChange(fallbackResponse);
          }
        } else {
          throw new Error('Could not generate visualization with available data.');
        }
      } else if (aiResponse) {
        // Remove the processing message
        const aiMessage: Message = {
          id: uuidv4(),
          sender: 'ai',
          content: aiResponse.explanation || 'No explanation available',
          timestamp: new Date(),
          result: aiResponse,
          model: currentModel
        };
        
        // Replace the processing message with the actual response
        setMessages(prevMessages => prevMessages.filter(m => m.id !== processingId).concat(aiMessage));
        
        if (onVisualizationChange) {
          onVisualizationChange(aiResponse);
        }
      } else {
        throw new Error('Failed to get AI response');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Error getting AI response', {
        description: error.message || 'Unknown error'
      });
      
      // Remove processing message if it exists
      setMessages(prevMessages => {
        const filteredMessages = prevMessages.filter(m => !m.isProcessing);
        return [
          ...filteredMessages,
          {
            id: uuidv4(),
            sender: 'ai',
            content: `Sorry, I encountered an error processing your request: ${error.message || 'Unknown error'}. Please try again with a different question or check if your dataset is available.`,
            timestamp: new Date()
          }
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadVisualization = () => {
    toast.info("Downloading visualization...");
  };

  const handleModelChange = (model: AIModelType) => {
    setCurrentModel(model);
  };
  
  const handleRetryLoading = () => {
    loadDataset();
  };
  
  const handleRefresh = async () => {
    setMessages([{
      id: uuidv4(),
      sender: 'ai',
      content: `Reloading dataset analysis for ${datasetName}...`,
      timestamp: new Date()
    }]);
    setFullData([]);
    await loadDataset();
  };

  const generateSampleDataFromSchema = (schema: Record<string, string>, count: number = 100) => {
    console.log("Generating sample data from schema:", schema);
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
  
  const generateAppropriateDataFromFilename = (fileName: string, count: number = 100) => {
    console.log("Generating appropriate sample data based on filename:", fileName);
    const lowerFileName = fileName.toLowerCase();
    const data = [];
    
    if (lowerFileName.includes('vehicle') || lowerFileName.includes('car') || lowerFileName.includes('electric')) {
      for (let i = 0; i < count; i++) {
        data.push({
          'VIN (1-10)': `SAMPLE${i}${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          'County': ['King', 'Pierce', 'Snohomish', 'Thurston', 'Clark', 'Spokane', 'Whatcom'][i % 7],
          'City': ['Seattle', 'Tacoma', 'Spokane', 'Bellevue', 'Olympia', 'Vancouver', 'Bellingham'][i % 7],
          'State': ['WA', 'OR', 'CA', 'ID', 'NY', 'FL', 'TX'][i % 7],
          'Postal Code': 90000 + Math.floor(Math.random() * 10000),
          'Model Year': 2014 + (i % 10),
          'Make': ['Tesla', 'Toyota', 'Ford', 'GM', 'Hyundai', 'Kia', 'Honda'][i % 7],
          'Model': ['Model 3', 'Leaf', 'F-150', 'Bolt', 'Ioniq', 'Kona', 'Prius'][i % 7],
          'Electric Vehicle Type': ['BEV', 'PHEV', 'FCEV', 'HEV'][i % 4],
          'Electric Range': 80 + Math.floor(Math.random() * 320),
          'Base MSRP': 30000 + Math.floor(Math.random() * 70000),
          'Legislative District': Math.floor(Math.random() * 49) + 1,
          'DOL Vehicle ID': 100000 + i
        });
      }
    } else if (lowerFileName.includes('sales') || lowerFileName.includes('revenue')) {
      for (let i = 0; i < count; i++) {
        data.push({
          'id': i + 1,
          'product': `Product ${i % 10 + 1}`,
          'category': ['Electronics', 'Clothing', 'Food', 'Books', 'Home'][i % 5],
          'date': new Date(2025, i % 12, (i % 28) + 1).toISOString().split('T')[0],
          'quantity': Math.floor(1 + Math.random() * 50),
          'price': Math.floor(10 + Math.random() * 990),
          'revenue': Math.floor(100 + Math.random() * 9900),
          'region': ['North', 'South', 'East', 'West', 'Central'][i % 5]
        });
      }
    } else {
      return generateGenericSampleData(count);
    }
    
    return data;
  };
  
  const generateGenericSampleData = (count: number = 100) => {
    const data = [];
    for (let i = 0; i < count; i++) {
      data.push({
        'id': i + 1,
        'name': `Item ${i + 1}`,
        'value': Math.floor(Math.random() * 1000),
        'category': ['A', 'B', 'C', 'D', 'E'][i % 5],
        'date': new Date(2025, i % 12, (i % 28) + 1).toISOString().split('T')[0],
        'active': i % 3 === 0
      });
    }
    return data;
  };

  return (
    <div className={`flex flex-col w-full ${hasFullHeightLayout ? 'h-full' : 'h-[600px]'} rounded-xl overflow-hidden glass-card`}>
      <div className="p-4 border-b border-gray-700/30 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium">{datasetName} Chat</h2>
          <p className="text-sm text-gray-400">
            Ask questions about your data to get insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ModelSelector 
            currentModel={currentModel} 
            onModelChange={handleModelChange} 
          />
          <Button 
            variant="outline" 
            size="sm"
            className="h-8"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </div>
      
      <div className="flex-grow overflow-auto bg-gradient-to-b from-gray-900/30 to-gray-900/50">
        {loadingState.isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400 mb-4" />
            <h3 className="font-medium text-gray-200">{loadingState.message || 'Loading data...'}</h3>
            <p className="text-sm text-gray-400 max-w-md mt-1">
              Preparing your dataset for analysis
            </p>
          </div>
        ) : (
          <ChatContainer 
            messages={messages}
            downloadVisualization={handleDownloadVisualization}
            datasetId={datasetId}
          />
        )}
      </div>
      
      <div className="p-4 border-t border-gray-700/30">
        {datasetLoadFailed ? (
          <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 flex-shrink-0" />
            <div>
              <p className="text-sm text-yellow-200">
                Using sample data for analysis. Actual dataset could not be loaded.
              </p>
              <Button 
                variant="link" 
                size="sm" 
                className="h-auto p-0 text-yellow-400"
                onClick={handleRefresh}
              >
                Try again
              </Button>
            </div>
          </div>
        ) : null}
        
        {recommendations.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {recommendations.slice(0, 5).map((rec, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="bg-purple-900/20 hover:bg-purple-900/40 text-purple-300 border-purple-700/30"
                onClick={() => handleSetQuery(rec)}
              >
                {rec}
              </Button>
            ))}
          </div>
        )}
        
        <ChatInput 
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          recommendations={recommendations}
          disabled={datasetLoadFailed && fullData.length === 0}
        />
      </div>
    </div>
  );
};

export default DatasetChatInterface;
