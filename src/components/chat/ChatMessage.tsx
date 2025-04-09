
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Message } from './types';
import { QueryResult } from '@/services/types/queryTypes';
import ChartWrapper from '../visualization/ChartWrapper';

interface ChatMessageProps {
  message: Message;
  downloadVisualization: (result: QueryResult) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, downloadVisualization }) => {
  const { sender, content, result, isProcessing } = message;
  
  const renderVisualization = () => {
    if (!result || !result.data || result.data.length === 0) return null;
    
    return (
      <div className="mt-4 bg-gray-800/50 p-3 rounded-lg border border-gray-700/50">
        <div className="mb-2">
          <p className="text-sm text-gray-300">{result.explanation || 'Visualization'}</p>
        </div>
        
        <div className="h-[300px] w-full">
          <ChartWrapper
            data={result.data}
            chartType={result.chartType || 'bar'}
            xAxisKey={result.xAxis || 'name'}
            yAxisKey={result.yAxis || 'value'}
            height="100%"
            width="100%"
          />
        </div>
        
        <div className="mt-3 flex justify-end">
          <button
            className="text-xs px-2 py-1 bg-purple-900/30 hover:bg-purple-800/50 text-purple-300 rounded border border-purple-700/30 transition-colors"
            onClick={() => downloadVisualization(result)}
          >
            Download Visualization
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex ${sender === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex gap-3 max-w-[85%] ${sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
        <Avatar className="h-8 w-8">
          {sender === 'user' ? (
            <>
              <AvatarFallback>U</AvatarFallback>
              <AvatarImage src="/user-avatar.png" />
            </>
          ) : (
            <>
              <AvatarFallback>AI</AvatarFallback>
              <AvatarImage src="/ai-avatar.png" />
            </>
          )}
        </Avatar>
        
        <div className={`${sender === 'user' ? 'bg-purple-600/30 text-white' : 'bg-gray-800/50 text-gray-200'} ${isProcessing ? 'animate-pulse' : ''} p-3 rounded-lg`}>
          <p className="whitespace-pre-wrap text-sm">{content}</p>
          {result && renderVisualization()}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
