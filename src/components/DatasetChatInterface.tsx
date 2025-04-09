
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { dataService } from '@/services/dataService';
import { queryService } from '@/services/queryService';
import ChatContainer from './chat/ChatContainer';
import ModelSelector from './chat/ModelSelector';
import ChatInput from './chat/ChatInput';
import { AIModelType, ChatMessage, AIQueryResponse, Message } from './chat/types';
import { Loader2, FileText, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChatUtils } from './chat/ChatUtils';
import { datasetUtils } from '@/utils/datasetUtils';
import { v4 as uuidv4 } from 'uuid';
import { nlpService } from '@/services/nlpService';

interface DatasetChatInterfaceProps {
  datasetId: string;
  datasetName?: string;
  onVisualizationChange?: (vizData: AIQueryResponse) => void;
  hasFullHeightLayout?: boolean;
}

const DatasetChatInterface: React.FC<DatasetChatInterfaceProps> = ({ 
  datasetId,
  datasetName = 'Dataset',
  onVisualizationChange,
  hasFullHeightLayout = false
}) => {
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
  const [recommendations, setRecommendations] = useState<string[]>([
    "What's the trend over time?",
    "Show me the top 5 values",
    "Compare by category",
    "Calculate average and sum"
  ]);
  const [datasetInfo, setDatasetInfo] = useState<any>(null);
  const navigate = useNavigate();

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
          toast.success(`Dataset loaded: ${datasetRows.length} rows available for analysis`);
        } else {
          // Fetch dataset info to generate sample data
          const dataset = await dataService.getDataset(datasetId);
          if (dataset && dataset.file_name) {
            const sampleData = generateAppropriateDataFromFilename(dataset.file_name, 1000);
            setFullData(sampleData);
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
        const recommendations = nlpService.getRecommendationsForDataset(dataset);
        const fallbackQuery = recommendations[0] || "Show the distribution of values";
        
        // Try the fallback query
        const fallbackResponse = await nlpService.processQuery(fallbackQuery, datasetId, currentModel, fullData);
        
        if (fallbackResponse && fallbackResponse.data && fallbackResponse.data.length > 0) {
          fallbackResponse.explanation = `I couldn't visualize "${newMessage}" directly, so I'm showing ${fallbackResponse.explanation?.toLowerCase() || 'some basic statistics about your data'}.`;
          
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

  const loadDataset = async () => {
    if (!datasetId) return;

    setLoadingState({
      isLoading: true,
      message: 'Loading dataset...'
    });
    setDatasetLoadFailed(false);

    try {
      // First, get the dataset information
      const dataset = await dataService.getDataset(datasetId);
      setDatasetInfo(dataset);
      
      if (dataset) {
        // Use enhanced datasetUtils to get the full dataset with multiple fallback strategies
        const datasetRows = await datasetUtils.loadDatasetContent(datasetId, {
          showToasts: false, // Don't show toasts during initial load
          forceRefresh: true, // Force refresh to ensure we get fresh data
          limitRows: 5000    // Increased limit for better analysis
        });

        if (datasetRows && Array.isArray(datasetRows) && datasetRows.length > 0) {
          setFullData(datasetRows);
          console.log(`Dataset loaded: ${datasetRows.length} rows available for chat`);
          
          // Update message to include row count
          setMessages([{
            id: uuidv4(),
            sender: 'ai',
            content: `I'm analyzing the ${datasetName} dataset with ${datasetRows.length} rows. Ask me anything about it!`,
            timestamp: new Date()
          }]);
          
          // Generate better recommendations
          const customRecommendations = nlpService.getRecommendationsForDataset(dataset);
          setRecommendations(customRecommendations);
          
          setLoadingState({
            isLoading: false,
            message: ''
          });
          
          return;
        }
        
        // If direct data loading failed, try alternate loading methods
        console.log("Direct data loading failed, trying to use queryService");
        const alternateData = await queryService.loadDataset(datasetId);
        if (alternateData && alternateData.length > 0) {
          setFullData(alternateData);
          console.log(`Dataset loaded through queryService: ${alternateData.length} rows`);
          
          setMessages([{
            id: uuidv4(),
            sender: 'ai',
            content: `I'm analyzing the ${datasetName} dataset with ${alternateData.length} rows. Ask me anything about it!`,
            timestamp: new Date()
          }]);
          
          // Generate better recommendations
          const customRecommendations = nlpService.getRecommendationsForDataset(dataset);
          setRecommendations(customRecommendations);
          
          setLoadingState({
            isLoading: false,
            message: ''
          });
          
          return;
        }
      
        // Generate appropriate recommendations
        const customRecommendations = nlpService.getRecommendationsForDataset(dataset);
        setRecommendations(customRecommendations);
        
        // If all methods failed, generate sample data based on schema or filename
        if (dataset.column_schema && Object.keys(dataset.column_schema).length > 0) {
          console.log("Generating sample data based on schema");
          const schemaSamples = generateSampleDataFromSchema(dataset.column_schema, 5000);
          setFullData(schemaSamples);
          
          setMessages([{
            id: uuidv4(),
            sender: 'ai',
            content: `I'm analyzing the ${datasetName} dataset with sample data. Ask me anything about it!`,
            timestamp: new Date()
          }]);
          
          toast.warning("Using generated sample data", {
            description: "The actual dataset could not be loaded"
          });
        } else {
          // No schema available, generate based on filename
          console.log("Generating appropriate sample data based on filename:", dataset.file_name);
          const filenameSamples = generateAppropriateDataFromFilename(dataset.file_name || '');
          setFullData(filenameSamples);
          
          toast.warning("Using generated sample data", {
            description: "The actual dataset could not be loaded"
          });
        }
      } else {
        throw new Error("Dataset not found");
      }
      
      setLoadingState({
        isLoading: false,
        message: ''
      });

    } catch (error) {
      console.error('Error loading dataset:', error);
      setLoadingState({
        isLoading: false,
        message: ''
      });
      setDatasetLoadFailed(true);
      
      // Set a minimal sample dataset for the chat to use
      const sampleData = generateGenericSampleData(100);
      setFullData(sampleData);
      
      setMessages([{
        id: uuidv4(),
        sender: 'ai',
        content: `I couldn't load the actual dataset, so I'm using sample data. Ask me anything, but be aware that responses will be based on generated data, not your actual dataset.`,
        timestamp: new Date()
      }]);
      
      toast.error('Could not load dataset', {
        description: 'Using sample data instead'
      });
    }
  };

  useEffect(() => {
    loadDataset();
    
    // Update dataset name in welcome message if it changes
    setMessages(prev => [{
      id: uuidv4(),
      sender: 'ai',
      content: `I'm analyzing the ${datasetName} dataset. Ask me anything about it!`,
      timestamp: new Date()
    }, ...prev.slice(1)]);
    
  }, [datasetId, datasetName]);

  const handleModelChange = (model: AIModelType) => {
    setCurrentModel(model);
  };
  
  const handleRetryLoading = () => {
    loadDataset();
  };
  
  function generateSampleDataFromSchema(schema: Record<string, string>, count: number) {
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
  }
  
  function generateAppropriateDataFromFilename(filename: string, count: number = 1000) {
    const lowerFilename = filename.toLowerCase();
    
    // Generate electric vehicle data if filename suggests it
    if (lowerFilename.includes('electric') || lowerFilename.includes('vehicle') || lowerFilename.includes('ev')) {
      return generateElectricVehicleData(count);
    }
    
    // Generate sales data if filename suggests it
    if (lowerFilename.includes('sales') || lowerFilename.includes('revenue')) {
      return generateSalesData(count);
    }
    
    // Default to generic sample data
    return generateGenericSampleData(count);
  }
  
  function generateElectricVehicleData(count: number) {
    const makes = ['Tesla', 'Nissan', 'Chevrolet', 'Ford', 'BMW', 'Audi', 'Hyundai', 'Kia', 'Volkswagen', 'Toyota'];
    const models = {
      'Tesla': ['Model S', 'Model 3', 'Model X', 'Model Y', 'Cybertruck'],
      'Nissan': ['Leaf', 'Ariya'],
      'Chevrolet': ['Bolt EV', 'Bolt EUV', 'Silverado EV'],
      'Ford': ['Mustang Mach-E', 'F-150 Lightning', 'E-Transit'],
      'BMW': ['i3', 'i4', 'iX'],
      'Audi': ['e-tron', 'Q4 e-tron', 'e-tron GT'],
      'Hyundai': ['Kona Electric', 'Ioniq 5', 'Ioniq 6'],
      'Kia': ['Niro EV', 'EV6', 'EV9'],
      'Volkswagen': ['ID.4', 'ID. Buzz'],
      'Toyota': ['bZ4X', 'Prius Prime']
    };
    const years = [2018, 2019, 2020, 2021, 2022, 2023, 2024];
    const vehicleTypes = ['BEV', 'PHEV', 'FCEV'];
    const states = ['CA', 'WA', 'NY', 'FL', 'TX', 'MA', 'NJ', 'CO', 'OR', 'IL'];
    
    return Array.from({ length: count }, (_, i) => {
      const make = makes[Math.floor(Math.random() * makes.length)];
      const modelOptions = models[make as keyof typeof models] || models['Tesla'];
      const model = modelOptions[Math.floor(Math.random() * modelOptions.length)];
      const vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
      const year = years[Math.floor(Math.random() * years.length)];
      const range = Math.floor(Math.random() * 300) + 100; // 100-400 miles
      const msrp = Math.floor(Math.random() * 70000) + 30000; // $30k-$100k
      const state = states[Math.floor(Math.random() * states.length)];
      
      return {
        VIN: `VIN${i}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        Make: make,
        Model: model,
        'Model Year': year,
        'Vehicle Type': vehicleType,
        'Electric Range': range,
        MSRP: msrp,
        State: state,
        City: `City ${Math.floor(i / 10) + 1}`,
        'Postal Code': Math.floor(Math.random() * 90000) + 10000,
        'Clean Alternative Fuel': 'Yes',
        'Registration Date': `${Math.floor(Math.random() * 12) + 1}/${Math.floor(Math.random() * 28) + 1}/${year}`
      };
    });
  }
  
  function generateSalesData(count: number) {
    const products = ['Widget A', 'Widget B', 'Service C', 'Product D', 'Solution E'];
    const regions = ['North', 'South', 'East', 'West', 'Central'];
    const channels = ['Online', 'Retail', 'Direct', 'Partner'];
    
    return Array.from({ length: count }, (_, i) => {
      const date = new Date(2023, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      const product = products[Math.floor(Math.random() * products.length)];
      const region = regions[Math.floor(Math.random() * regions.length)];
      const channel = channels[Math.floor(Math.random() * channels.length)];
      const quantity = Math.floor(Math.random() * 100) + 1;
      const unitPrice = Math.floor(Math.random() * 500) + 10;
      const revenue = quantity * unitPrice;
      
      return {
        OrderID: `ORD-${10000 + i}`,
        Date: date.toISOString().split('T')[0],
        Product: product,
        Region: region,
        Channel: channel,
        Quantity: quantity,
        UnitPrice: unitPrice,
        Revenue: revenue,
        CustomerID: `CUST-${Math.floor(Math.random() * 1000) + 1}`
      };
    });
  }
  
  function generateGenericSampleData(rows: number) {
    return Array.from({ length: rows }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      value: Math.floor(Math.random() * 1000),
      category: ['A', 'B', 'C', 'D', 'E'][i % 5],
      date: new Date(2025, i % 12, (i % 28) + 1).toISOString().split('T')[0],
      active: i % 3 === 0
    }));
  }

  return (
    <div className={`flex flex-col ${hasFullHeightLayout ? 'h-full' : ''}`}>
      {loadingState.isLoading ? (
        <Card className="flex items-center justify-center p-6 glass-card h-48 mb-4">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-purple-500" />
            <p className="text-gray-300">{loadingState.message || 'Loading dataset...'}</p>
          </div>
        </Card>
      ) : datasetLoadFailed ? (
        <Card className="flex flex-col items-center justify-center p-6 glass-card mb-4">
          <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
          <h3 className="text-lg font-medium mb-1">Failed to load dataset</h3>
          <p className="text-gray-300 text-center mb-4">Using sample data for analysis</p>
          <Button 
            variant="outline" 
            className="border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20"
            onClick={handleRetryLoading}
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Retry
          </Button>
        </Card>
      ) : null}

      <div className="flex flex-col space-y-4 flex-1">
        <div className="flex items-center justify-between">
          <ModelSelector currentModel={currentModel} onModelChange={handleModelChange} />
        </div>
        
        <div className="flex-1 flex flex-col min-h-[500px]">
          <ChatContainer messages={messages} downloadVisualization={handleDownloadVisualization} />
          <div className="mt-4">
            <ChatInput 
              onSendMessage={handleSendMessage} 
              isLoading={isLoading} 
              recommendations={recommendations}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DatasetChatInterface;
