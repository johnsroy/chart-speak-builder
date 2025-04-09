
import React from 'react';
import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { BarChart, PieChart, LineChart, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChartWrapper from '../visualization/ChartWrapper';
import { Message, VisualizationType } from './types';
import { QueryResult } from '@/services/types/queryTypes';
import { Skeleton } from '@/components/ui/skeleton';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: Message;
  downloadVisualization?: (result: QueryResult) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, downloadVisualization }) => {
  if (message.isProcessing) {
    return (
      <div className="flex gap-3 items-start">
        <Avatar className="h-8 w-8 mr-2">
          <AvatarImage src="/ai-avatar.png" alt="AI" />
        </Avatar>
        <div className="flex flex-col gap-2 w-full max-w-5xl">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[400px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
      </div>
    );
  }

  let chartType = 'bar';
  if (message.visualization?.chartType) {
    chartType = message.visualization.chartType;
  } else if (message.visualizationType) {
    switch (message.visualizationType) {
      case VisualizationType.LineChart: 
        chartType = 'line'; 
        break;
      case VisualizationType.PieChart: 
        chartType = 'pie'; 
        break;
      case VisualizationType.BarChart: 
      default: 
        chartType = 'bar';
    }
  }

  const renderVisualization = () => {
    if (!message.visualization?.data && !message.chartData) {
      return null;
    }

    const data = message.visualization?.data || message.chartData;
    if (!data || !Array.isArray(data) || data.length === 0) {
      return null;
    }

    let xAxisKey = message.visualization?.xAxis || 'name';
    let yAxisKey = message.visualization?.yAxis || 'value';

    // If xAxisKey/yAxisKey are not in the data, try to find appropriate keys
    if (data.length > 0 && !data[0].hasOwnProperty(xAxisKey)) {
      const keys = Object.keys(data[0]);
      xAxisKey = keys[0]; // Use first key as fallback for x-axis
    }

    if (data.length > 0 && !data[0].hasOwnProperty(yAxisKey)) {
      const keys = Object.keys(data[0]);
      // Try to find a numeric key for y-axis
      const numericKey = keys.find(k => typeof data[0][k] === 'number');
      yAxisKey = numericKey || keys[keys.length > 1 ? 1 : 0]; // Use second key or first if only one exists
    }

    // Increased height for better visibility
    return (
      <div className="mt-4 w-full bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            {chartType === 'bar' && <BarChart className="h-5 w-5 text-blue-400 mr-2" />}
            {chartType === 'line' && <LineChart className="h-5 w-5 text-green-400 mr-2" />}
            {chartType === 'pie' && <PieChart className="h-5 w-5 text-purple-400 mr-2" />}
            <span className="font-medium">{message.visualization?.title || message.visualization?.chart_title || 'Data Visualization'}</span>
          </div>
          {downloadVisualization && message.visualization && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => downloadVisualization(message.visualization!)}
              className="text-gray-400 hover:text-white"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          )}
        </div>
        
        <div className="w-full h-[600px]"> {/* Increased height */}
          <ChartWrapper
            data={data}
            chartType={chartType}
            xAxisKey={xAxisKey}
            yAxisKey={yAxisKey}
            height={550} // Increased height
            className="w-full"
          />
        </div>
        
        {message.visualization?.stats && (
          <div className="mt-3 text-sm text-gray-400">
            <p>
              Count: {message.visualization.stats.count} | 
              Sum: {message.visualization.stats.sum?.toLocaleString()} | 
              Average: {message.visualization.stats.avg?.toLocaleString()} | 
              Min: {message.visualization.stats.min?.toLocaleString()} | 
              Max: {message.visualization.stats.max?.toLocaleString()}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("flex gap-3 items-start", 
      message.sender === 'user' ? "justify-end" : "")}>
      
      {message.sender !== 'user' && (
        <Avatar className="h-8 w-8 mr-2">
          <AvatarImage src="/ai-avatar.png" alt="AI" />
        </Avatar>
      )}
      
      <div className={cn("flex flex-col gap-2 w-full max-w-[90%] lg:max-w-[95%]",
        message.sender === 'user' ? "items-end" : "")}>
        
        <div className={cn("px-4 py-3 rounded-lg",
          message.sender === 'user' 
            ? "bg-purple-600/30 border border-purple-500/30 text-white" 
            : "bg-gray-800/50 border border-gray-700/30 text-gray-100"
        )}>
          <ReactMarkdown>
            {message.content}
          </ReactMarkdown>
        </div>
        
        {renderVisualization()}
      </div>
      
      {message.sender === 'user' && (
        <Avatar className="h-8 w-8 ml-2">
          <AvatarImage src="/user-avatar.png" alt="User" />
        </Avatar>
      )}
    </div>
  );
};

export default ChatMessage;
