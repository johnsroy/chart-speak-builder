
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
  const { sender, content, result, isProcessing, model } = message;
  
  const renderVisualization = () => {
    if (!result || !result.data || result.data.length === 0) return null;
    
    return (
      <div className="mt-6 bg-gray-800/50 p-4 rounded-lg border border-gray-700/50 shadow-inner">
        <div className="mb-3">
          <p className="text-sm text-gray-300">{result.explanation || 'Visualization'}</p>
        </div>
        
        {/* Increased height for better visualization display */}
        <div className="h-[800px] w-full">
          <ChartWrapper
            data={result.data}
            chartType={result.chartType || 'bar'}
            xAxisKey={result.xAxis || 'name'}
            yAxisKey={result.yAxis || 'value'}
            height="100%"
            width="100%"
          />
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <div className="text-xs text-gray-400">
            {result.model_used && (
              <span className="px-2 py-1 bg-gray-800 rounded-full text-gray-400">
                {result.model_used === 'openai' ? 'GPT-4o' : 'Claude 3.7'}
              </span>
            )}
          </div>
          <button
            className="text-xs px-3 py-1.5 bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 rounded border border-purple-700/30 transition-colors"
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
      <div className={`flex gap-3 max-w-[95%] ${sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
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
        
        <div className={`${sender === 'user' ? 'bg-purple-600/30 text-white' : 'bg-gray-800/50 text-gray-200'} ${isProcessing ? 'animate-pulse' : ''} p-4 rounded-lg max-w-full`}>
          <p className="whitespace-pre-wrap text-sm">{content}</p>
          {model && !isProcessing && (
            <div className="mt-2">
              <span className="text-xs text-gray-400">
                {model === 'openai' ? 'GPT-4o' : 'Claude 3.7'}
              </span>
            </div>
          )}
          {result && renderVisualization()}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
