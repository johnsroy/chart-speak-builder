
import React from 'react';
import { Message, VisualizationType } from './chat/types';
import ChartVisualization from './ChartVisualization';
import { cn } from '@/lib/utils';
import { Card } from './ui/card';
import { Separator } from './ui/separator';
import { Avatar } from './ui/avatar';
import { User, Bot } from 'lucide-react';

interface ChatBubbleProps {
  message: Message;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  const isAI = message.sender === 'ai';
  
  return (
    <div className={cn(
      "flex w-full mb-4",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "flex gap-3 max-w-[85%]",
        isUser ? "flex-row-reverse" : "flex-row"
      )}>
        <Avatar className={cn(
          "h-8 w-8 flex items-center justify-center",
          isUser ? "bg-blue-600" : "bg-purple-700"
        )}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-5 w-5" />}
        </Avatar>
        
        <div className={cn(
          "flex flex-col",
          isUser ? "items-end" : "items-start"
        )}>
          <Card className={cn(
            "p-3 break-words",
            isUser ? "bg-blue-900/50 border-blue-800" : "bg-gray-900/50 border-gray-800",
            "prose prose-invert max-w-none"
          )}>
            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
            
            {message.visualizationType && message.result && (
              <div className="mt-3">
                <Separator className="my-2" />
                <div className="h-[300px] w-full mt-2">
                  <ChartVisualization 
                    chartType={message.visualizationType as any}
                    data={message.result.data || []}
                    className="w-full h-full"
                    datasetId={message.result.dataset_id || ""}
                  />
                </div>
              </div>
            )}
          </Card>
          
          <div className="text-xs text-gray-400 mt-1">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            {message.model && (
              <span className="ml-2 text-xs text-gray-500">
                via {message.model === 'openai' ? 'GPT' : 'Claude'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
