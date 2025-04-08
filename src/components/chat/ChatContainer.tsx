
import React, { useRef, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import ChatMessage from './ChatMessage';
import { Message } from './types';
import { QueryResult } from '@/services/types/queryTypes';

interface ChatContainerProps {
  messages: Message[];
  downloadVisualization: (result: QueryResult) => void;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ messages, downloadVisualization }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({
        behavior: 'smooth'
      });
    }
  }, [messages]);

  return (
    <Card className="flex-1 overflow-hidden glass-card backdrop-blur-xl bg-gray-950/30 border border-purple-500/20 shadow-xl">
      <ScrollArea className="h-full pr-4">
        <CardContent className="pt-6 pb-2">
          <div className="flex flex-col space-y-4">
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
