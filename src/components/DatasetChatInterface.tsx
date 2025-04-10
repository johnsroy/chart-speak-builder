
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { ChatBubble } from '@/components/ChatBubble';
import { dataService } from '@/services/dataService';
import { Message, AIModelType, VisualizationType } from './chat/types';
import { useAuth } from '@/hooks/useAuth';
import { toast } from "sonner";
import { useTheme } from "@/components/ThemeProvider";
import { datasetUtils } from '@/utils/datasetUtils';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { generateAIQuery, generateDatasetSuggestions } from '@/utils/aiUtils';
import ModelSelector from './chat/ModelSelector';
import ChatInput from './chat/ChatInput';
import { QueryResult } from '@/services/types/queryTypes';
import { supabase } from '@/lib/supabase';

export interface DatasetChatInterfaceProps {
  datasetId?: string;
  datasetName?: string;
}

const DatasetChatInterface: React.FC<DatasetChatInterfaceProps> = ({ 
  datasetId: propDatasetId,
  datasetName 
}) => {
  const { datasetId: routeDatasetId } = useParams<{ datasetId: string }>();
  const datasetId = propDatasetId || routeDatasetId;
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentModel, setCurrentModel] = useState<AIModelType>('openai');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [datasetInfo, setDatasetInfo] = useState<any>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const { user } = useAuth();
  const { theme } = useTheme();
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load dataset information to provide context for the AI
  useEffect(() => {
    const loadDatasetInfo = async () => {
      if (!datasetId) return;
      
      setIsDataLoading(true);
      
      try {
        // Get dataset metadata
        const { data, error } = await supabase
          .from('datasets')
          .select('*')
          .eq('id', datasetId)
          .single();
          
        if (error) {
          console.error("Error loading dataset info:", error);
          return;
        }
        
        if (data) {
          setDatasetInfo(data);
          console.log("Dataset info loaded:", data);
        }
      } catch (error) {
        console.error("Error in loadDatasetInfo:", error);
      } finally {
        setIsDataLoading(false);
      }
    };
    
    loadDatasetInfo();
  }, [datasetId]);

  // Generate smart suggestions based on dataset content
  useEffect(() => {
    const loadSuggestions = async () => {
      if (!datasetId) return;
      
      try {
        // Try to get custom suggestions based on actual dataset content
        if (datasetInfo) {
          const customSuggestions = await generateDatasetSuggestions(datasetId, datasetInfo);
          setSuggestions(customSuggestions);
          return;
        }
        
        // Fallback to basic suggestions if no dataset info
        const basicSuggestions = [
          `What are the key trends in this dataset?`,
          `Summarize this dataset for me`,
          `What insights can you provide from this data?`,
          `Show me the top 5 insights`,
          `What's interesting about this dataset?`
        ];
        
        setSuggestions(basicSuggestions);
      } catch (error) {
        console.error("Error loading suggestions:", error);
        setSuggestions([
          `What are the key trends in this dataset?`,
          `Give me a summary of the data`,
          `What are the top 5 insights?`
        ]);
      }
    };
    
    loadSuggestions();
  }, [datasetId, datasetInfo]);

  const handleSuggestionSelect = async (query: string) => {
    await handleSendMessage(query);
  };

  const handleSendMessage = async (content: string) => {
    if (!datasetId) {
      toast.error("No dataset selected. Please select a dataset to start the conversation.");
      return;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content: content,
      timestamp: new Date(),
    };

    setMessages(prevMessages => [...prevMessages, newMessage]);
    setIsLoading(true);

    try {
      // First try to load dataset content to provide to the AI
      let datasetContent = null;
      try {
        // Try to get a sample of the dataset to provide as context
        datasetContent = await datasetUtils.loadDatasetContent(datasetId, {
          showToasts: false,
          limitRows: 100 // Just get a sample for context
        });
        
        if (datasetContent) {
          console.log(`Loaded ${datasetContent.length} rows for AI context`);
        }
      } catch (contentError) {
        console.warn("Could not load dataset content for AI context:", contentError);
      }
      
      // Generate AI response with enhanced context
      const aiResponse = await generateAIQuery(
        content, 
        datasetId, 
        currentModel, 
        user?.id,
        datasetInfo, // Pass dataset metadata
        datasetContent // Pass sample data
      );

      if (aiResponse) {
        const aiMessage: Message = {
          id: Date.now().toString(),
          sender: 'ai',
          content: aiResponse.explanation || "I couldn't find an explanation for this query.",
          timestamp: new Date(),
          result: aiResponse,
          model: currentModel,
          visualizationType: aiResponse.chart_type as VisualizationType,
          queryId: aiResponse.query_id
        };

        setMessages(prevMessages => [...prevMessages, aiMessage]);
      } else {
        toast.error("Failed to generate AI response. Please try again.");
      }
    } catch (error: any) {
      console.error("Error generating AI query:", error);
      toast.error(`Failed to generate AI response: ${error.message || 'Unknown error'}`);

      setMessages(prevMessages => [
        ...prevMessages,
        {
          id: Date.now().toString(),
          sender: 'ai',
          content: `Sorry, I encountered an error: ${error.message || 'Unknown error'}`,
          timestamp: new Date(),
          model: currentModel
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="h-full flex flex-col bg-transparent border-none shadow-none">
      <CardContent className="h-full flex flex-col p-0">
        {/* Chat Interface */}
        <div className="flex flex-col h-full">
          {/* Chat Header */}
          <div className="flex items-center justify-between p-4 border-bottom border-gray-800 bg-black/20 backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-white">
              {datasetName ? `${datasetName} - Chat` : (datasetInfo?.name ? `${datasetInfo.name} - Chat` : 'Data Chat')}
            </h2>
            
            {/* Model Selector */}
            <ModelSelector 
              currentModel={currentModel} 
              onModelChange={setCurrentModel} 
            />
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            <ScrollArea className="h-full">
              {messages.length === 0 && !isLoading ? (
                <div className="text-center space-y-4 py-8">
                  <div className="text-gray-500 mb-4">
                    Ask questions about your dataset to get insights!
                  </div>
                  {datasetInfo && (
                    <div className="bg-purple-900/30 rounded-lg p-4 max-w-lg mx-auto text-left">
                      <h3 className="font-medium mb-2">Dataset Information</h3>
                      <p className="text-sm text-gray-300 mb-2">
                        <strong>Name:</strong> {datasetInfo.name}
                      </p>
                      {datasetInfo.description && (
                        <p className="text-sm text-gray-300 mb-2">
                          <strong>Description:</strong> {datasetInfo.description}
                        </p>
                      )}
                      <p className="text-sm text-gray-300">
                        <strong>File:</strong> {datasetInfo.file_name}
                        {datasetInfo.row_count > 0 && ` (${datasetInfo.row_count.toLocaleString()} rows)`}
                      </p>
                    </div>
                  )}
                </div>
              ) : null}

              {messages.map((message) => (
                <ChatBubble key={message.id} message={message} />
              ))}
              <div ref={chatBottomRef} />
            </ScrollArea>
          </div>

          {/* Chat Input */}
          <ChatInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            suggestions={suggestions}
            onSuggestionSelect={handleSuggestionSelect}
            placeholder="Ask questions about your dataset..."
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default DatasetChatInterface;
