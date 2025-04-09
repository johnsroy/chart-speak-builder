import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { ChatBubble } from './ChatBubble';
import { dataService } from '@/services/dataService';
import { Message, AIModelType, VisualizationType } from './chat/types';
import { useAuth } from '@/hooks/useAuth';
import { toast } from "sonner";
import { useTheme } from "@/components/ThemeProvider";
import { Settings } from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { generateAIQuery } from '@/utils/aiUtils';
import ModelSelector from './chat/ModelSelector';
import ChatInput from './chat/ChatInput';
import { QueryResult } from '@/services/types/queryTypes';

interface DatasetChatInterfaceProps {
  datasetId?: string;
}

const DatasetChatInterface: React.FC<DatasetChatInterfaceProps> = ({ datasetId: propDatasetId }) => {
  const { datasetId: routeDatasetId } = useParams<{ datasetId: string }>();
  const datasetId = propDatasetId || routeDatasetId;
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentModel, setCurrentModel] = useState<AIModelType>('openai');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { user } = useAuth();
  const { theme } = useTheme();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (datasetId) {
      setSuggestions([
        `What are the key trends in this dataset?`,
        `Give me a summary of the data.`,
        `What are the top 5 insights?`
      ]);
    }
  }, [datasetId]);

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
      const aiResponse = await generateAIQuery(content, datasetId, currentModel, user?.id);

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
            <h2 className="text-lg font-semibold text-white">Data Chat</h2>
            
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
                <div className="text-center text-gray-500 mt-4">
                  Start the conversation by sending a message!
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
