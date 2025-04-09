
import React, { useRef, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatMessage from './ChatMessage';
import { Message } from './types';
import { QueryResult } from '@/services/types/queryTypes';
import { useAuth } from '@/hooks/useAuth';

interface ChatContainerProps {
  messages: Message[];
  downloadVisualization: (result: QueryResult) => void;
  datasetId?: string;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ messages, downloadVisualization, datasetId }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { canUseAIFeatures } = useAuth();

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({
        behavior: 'smooth'
      });
    }
  }, [messages]);

  // Display a message when user isn't logged in and no messages are available
  if (!canUseAIFeatures && messages.length === 0) {
    return (
      <Card className="flex-1 overflow-hidden glass-card backdrop-blur-xl bg-gray-950/30 border border-purple-500/20 shadow-xl">
        <CardContent className="pt-6 pb-2 flex items-center justify-center h-full">
          <div className="text-center">
            <h3 className="text-xl font-semibold mb-2">AI Chat Feature</h3>
            <p className="text-gray-400">
              Please log in to access the AI chat features and analyze your data.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex-1 overflow-hidden glass-card backdrop-blur-xl bg-gray-950/30 border border-purple-500/20 shadow-xl">
      <ScrollArea className="h-full pr-4">
        <CardContent className="pt-6 pb-6">
          <div className="flex flex-col space-y-8">
            {messages.map(message => (
              <ChatMessage 
                key={message.id} 
                message={message}
                downloadVisualization={downloadVisualization}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
};

export default ChatContainer;
