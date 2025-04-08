import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { dataService } from '@/services/dataService';
import { queryService } from '@/services/queryService';
import ChatContainer from './chat/ChatContainer';
import ModelSelector from './chat/ModelSelector';
import ChatInput from './chat/ChatInput';
import { AIModelType, ChatMessage, AIQueryResponse } from './chat/types';
import { Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChatUtils } from './chat/ChatUtils';
import { datasetUtils } from '@/utils/datasetUtils';

interface DatasetChatInterfaceProps {
  datasetId: string;
  datasetName?: string;
  onVisualizationChange?: (vizData: AIQueryResponse) => void;
  hasFullHeightLayout?: boolean;
}

const initialSystemMessage = (datasetName: string) => `
You are a helpful AI assistant that helps analyze a dataset called ${datasetName}.
I will provide you with the dataset, and you should answer any questions I have about it.
You can perform calculations, aggregations, and groupings.
Be as concise as possible.
`;

const DatasetChatInterface: React.FC<DatasetChatInterfaceProps> = ({ 
  datasetId,
  datasetName = 'Dataset',
  onVisualizationChange,
  hasFullHeightLayout = false
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'system',
      content: initialSystemMessage(datasetName)
    }
  ]);
  const [currentModel, setCurrentModel] = useState<AIModelType>('openai');
  const [isLoading, setIsLoading] = useState(false);
  const [fullData, setFullData] = useState<any[]>([]);
  const [loadingState, setLoadingState] = useState({
    isLoading: false,
    message: ''
  });
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
    const userMessage: ChatMessage = {
      role: 'user',
      content: newMessage
    };
    setMessages(prevMessages => [...prevMessages, userMessage]);

    try {
      const aiResponse = await ChatUtils.getAIQuery(datasetId, newMessage, currentModel, fullData);

      if (aiResponse) {
        const aiMessage: ChatMessage = {
          role: 'assistant',
          content: aiResponse.explanation || 'No explanation available'
        };
        setMessages(prevMessages => [...prevMessages, aiMessage]);
        
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
      setMessages(prevMessages => [
        ...prevMessages,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error processing your request.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!datasetId) return;

    const fetchFullDataset = async () => {
      setLoadingState({
        isLoading: true,
        message: 'Loading dataset...'
      });

      try {
        // Use enhanced datasetUtils to get the full dataset with multiple fallback strategies
        const datasetRows = await datasetUtils.loadDatasetContent(datasetId, {
          showToasts: false // Don't show toasts during initial load
        });

        if (datasetRows && Array.isArray(datasetRows) && datasetRows.length > 0) {
          setFullData(datasetRows);
          console.log(`Dataset loaded: ${datasetRows.length} rows available for chat`);
          
          // Update initial message to include row count
          setMessages(prevMessages => {
            const systemMsg = prevMessages[0];
            return [
              {
                ...systemMsg,
                content: `I'm analyzing the ${datasetName} dataset with ${datasetRows.length} rows. Ask me anything about it!`
              },
              ...prevMessages.slice(1)
            ];
          });
          
          setLoadingState({
            isLoading: false,
            message: ''
          });
          
          return;
        }
        
        // If datasetUtils failed, try to get dataset metadata to generate samples
        const dataset = await dataService.getDataset(datasetId);
        
        if (dataset) {
          console.log("Dataset found:", dataset.name);
          
          // Generate sample data based on schema
          if (dataset.column_schema && Object.keys(dataset.column_schema).length > 0) {
            console.log("Generating sample data based on schema");
            const schemaSamples = generateSampleDataFromSchema(dataset.column_schema, 5000);
            setFullData(schemaSamples);
            
            setMessages(prevMessages => {
              const systemMsg = prevMessages[0];
              return [
                {
                  ...systemMsg,
                  content: `I'm analyzing the ${datasetName} dataset with sample data. Ask me anything about it!`
                },
                ...prevMessages.slice(1)
              ];
            });
          } else {
            // No schema available, generate based on filename
            console.log("Generating appropriate sample data based on filename:", dataset.file_name);
            const filenameSamples = generateAppropriateDataFromFilename(dataset.file_name || '');
            setFullData(filenameSamples);
          }
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
        
        toast.error('Could not load full dataset', {
          description: 'Using sample data instead'
        });
        
        // Set a minimal sample dataset for the chat to use
        setFullData(generateGenericSampleData(100));
      }
    };

    fetchFullDataset();
  }, [datasetId, datasetName]);

  const handleModelChange = (model: AIModelType) => {
    setCurrentModel(model);
  };
  
  const generateSampleDataFromSchema = (schema: Record<string, string>, count: number) => {
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
  
  const generateAppropriateDataFromFilename = (filename: string) => {
    const lowerFilename = filename.toLowerCase();
    let sampleData = [];
    const rows = 50;
    
    if (lowerFilename.includes('vehicle') || lowerFilename.includes('car') || lowerFilename.includes('auto')) {
      sampleData = Array.from({ length: rows }, (_, i) => ({
        id: i + 1,
        make: ['Toyota', 'Honda', 'Ford', 'Tesla', 'BMW', 'Mercedes', 'Audi'][i % 7],
        model: ['Model 3', 'Corolla', 'F-150', 'Civic', 'X5', 'E-Class'][i % 6],
        year: 2015 + (i % 8),
        price: Math.floor(20000 + Math.random() * 50000),
        color: ['Black', 'White', 'Red', 'Blue', 'Silver', 'Gray'][i % 6],
        electric: [true, false, false, false, true][i % 5],
        mileage: Math.floor(Math.random() * 100000)
      }));
    } else if (lowerFilename.includes('sales') || lowerFilename.includes('revenue')) {
      sampleData = Array.from({ length: rows }, (_, i) => ({
        id: i + 1,
        product: `Product ${i % 10 + 1}`,
        category: ['Electronics', 'Clothing', 'Food', 'Books', 'Home'][i % 5],
        date: new Date(2025, i % 12, (i % 28) + 1).toISOString().split('T')[0],
        quantity: Math.floor(1 + Math.random() * 50),
        price: Math.floor(10 + Math.random() * 990),
        revenue: Math.floor(100 + Math.random() * 9900),
        region: ['North', 'South', 'East', 'West', 'Central'][i % 5]
      }));
    } else if (lowerFilename.includes('survey') || lowerFilename.includes('feedback')) {
      sampleData = Array.from({ length: rows }, (_, i) => ({
        id: i + 1,
        question: `Survey Question ${i % 5 + 1}`,
        response: ['Strongly Agree', 'Agree', 'Neutral', 'Disagree', 'Strongly Disagree'][i % 5],
        age_group: ['18-24', '25-34', '35-44', '45-54', '55+'][i % 5],
        gender: ['Male', 'Female', 'Non-binary', 'Prefer not to say'][i % 4],
        date_submitted: new Date(2025, i % 12, (i % 28) + 1).toISOString().split('T')[0]
      }));
    } else {
      sampleData = Array.from({ length: rows }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        value: Math.floor(Math.random() * 1000),
        category: ['A', 'B', 'C', 'D', 'E'][i % 5],
        date: new Date(2025, i % 12, (i % 28) + 1).toISOString().split('T')[0],
        active: i % 3 === 0
      }));
    }
    
    return sampleData;
  };
  
  const generateGenericSampleData = (rows: number) => {
    return Array.from({ length: rows }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      value: Math.floor(Math.random() * 1000),
      category: ['A', 'B', 'C', 'D', 'E'][i % 5],
      date: new Date(2025, i % 12, (i % 28) + 1).toISOString().split('T')[0],
      active: i % 3 === 0
    }));
  };

  return (
    <div className={`flex flex-col h-full ${hasFullHeightLayout ? 'min-h-[80vh]' : ''}`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <h2 className="text-xl font-semibold">
          <FileText className="inline-block mr-2 h-5 w-5" />
          {datasetName} Chat
        </h2>
        <ModelSelector currentModel={currentModel} onModelChange={handleModelChange} />
      </div>
      
      <div className="flex-grow overflow-y-auto">
        {loadingState.isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin text-purple-400 mx-auto mb-4" />
              <p className="text-gray-400">{loadingState.message}</p>
            </div>
          </div>
        ) : (
          <ChatContainer messages={messages} />
        )}
      </div>
      
      <div className="p-4 border-t border-gray-700/50">
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>
    </div>
  );
};

export default DatasetChatInterface;
