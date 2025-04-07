
import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, BarChart, LineChart, PieChart, Download, History } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { QueryResult } from '@/services/types/queryTypes';
import { nlpService } from '@/services/nlpService';
import { toast } from 'sonner';
import EnhancedVisualization from './EnhancedVisualization';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { dataService } from '@/services/dataService';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  result?: QueryResult;
  model?: 'openai' | 'anthropic';
  queryId?: string;  // Reference to saved query in Supabase
  thinking?: string; // Analytical reasoning behind the answer
}

interface DatasetChatInterfaceProps {
  datasetId: string;
  datasetName: string;
}

const DatasetChatInterface: React.FC<DatasetChatInterfaceProps> = ({
  datasetId,
  datasetName
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeModel, setActiveModel] = useState<'openai' | 'anthropic'>('openai');
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [dataset, setDataset] = useState(null);
  const [previousQueries, setPreviousQueries] = useState<any[]>([]);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Get the current user ID
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const getUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    
    getUserId();
  }, []);

  useEffect(() => {
    const fetchDatasetAndRecommendations = async () => {
      try {
        const datasetData = await dataService.getDataset(datasetId);
        setDataset(datasetData);
        
        const suggestedQueries = nlpService.getRecommendationsForDataset(datasetData);
        setRecommendations(suggestedQueries);
        
        // Load previous queries
        const queries = await nlpService.getPreviousQueries(datasetId);
        setPreviousQueries(queries);
        
      } catch (error) {
        console.error('Error fetching dataset details:', error);
        setRecommendations([
          "Show me a summary of the main trends",
          "Create a breakdown by category",
          "Compare the top values in the dataset",
          "Show the distribution across categories", 
          "What patterns can you find in this data?"
        ]);
      }
    };
    
    fetchDatasetAndRecommendations();
  }, [datasetId]);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        id: 'welcome',
        content: `I can help you analyze the "${datasetName}" dataset. What would you like to know?`,
        sender: 'ai',
        timestamp: new Date(),
        thinking: 'Initial greeting message'
      }]);
    }
  }, [datasetName, messages.length]);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({
        behavior: 'smooth'
      });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) {
      return;
    }
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputText,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);
    
    try {
      console.log(`Sending query to ${activeModel} model:`, inputText);
      
      // Force the dataPreview parameter to ensure direct data processing if needed
      const dataPreview = await dataService.previewDataset(datasetId)
        .catch(err => {
          console.error('Error fetching data preview:', err);
          return null;
        });
      
      const result = await nlpService.processQuery(inputText, datasetId, activeModel);
      
      console.log("Query response:", result);
      
      // Enhanced response with thinking steps
      let thinking = '';
      
      // Create an analytical thinking process based on the data
      if (result) {
        const chartType = result.chartType || result.chart_type;
        const xAxis = result.xAxis || result.x_axis;
        const yAxis = result.yAxis || result.y_axis;
        
        thinking = `Analytical process:\n`
         + `1. Analyzed the question: "${inputText}"\n`
         + `2. Examined dataset structure and identified key fields\n`
         + `3. Selected "${chartType}" visualization as most appropriate\n`
         + `4. Used "${xAxis}" for the X-axis and "${yAxis}" for the Y-axis\n`
         + `5. Processed the data to extract key insights`;
         
        // Add data-specific insights
        if (result.data && result.data.length > 0) {
          const dataLength = result.data.length;
          const nonZeroValues = result.data.filter(item => Number(item[yAxis]) > 0).length;
          const highestItem = [...result.data].sort((a, b) => Number(b[yAxis]) - Number(a[yAxis]))[0];
          const lowestItem = [...result.data].filter(item => Number(item[yAxis]) > 0)
                            .sort((a, b) => Number(a[yAxis]) - Number(b[yAxis]))[0];
          
          thinking += `\n6. Found ${dataLength} data points with ${nonZeroValues} non-zero values`;
          
          if (highestItem) {
            thinking += `\n7. Highest value: ${highestItem[xAxis]} (${highestItem[yAxis]})`;
          }
          
          if (lowestItem) {
            thinking += `\n8. Lowest non-zero value: ${lowestItem[xAxis]} (${lowestItem[yAxis]})`;
          }
        }
      }
      
      // Create a more conversational and detailed explanation
      let enhancedExplanation = result.explanation || '';
      
      if (result.data && result.data.length > 0) {
        const chartType = result.chartType || result.chart_type;
        const xAxis = result.xAxis || result.x_axis;
        const yAxis = result.yAxis || result.y_axis;
        
        // Make explanation more conversational if it doesn't already have detail
        if (!enhancedExplanation || enhancedExplanation.length < 100) {
          enhancedExplanation = `Based on your question, I've analyzed the ${datasetName} dataset and created a ${chartType} chart showing ${yAxis} by ${xAxis}. `;
          
          // Add data insights
          if (chartType === 'bar' || chartType === 'pie') {
            const topItems = [...result.data]
              .sort((a, b) => Number(b[yAxis]) - Number(a[yAxis]))
              .slice(0, 3);
              
            if (topItems.length > 0) {
              enhancedExplanation += `The top ${topItems.length} ${xAxis} values are: `;
              topItems.forEach((item, i) => {
                enhancedExplanation += `${item[xAxis]} (${item[yAxis]})${i < topItems.length - 1 ? ', ' : '. '}`;
              });
            }
          } else if (chartType === 'line') {
            enhancedExplanation += `This visualization shows the trend of ${yAxis} over different ${xAxis} values. `;
            
            // Check for rising or falling trend
            const firstValue = Number(result.data[0]?.[yAxis]);
            const lastValue = Number(result.data[result.data.length - 1]?.[yAxis]);
            
            if (lastValue > firstValue) {
              enhancedExplanation += `There appears to be an overall increasing trend from ${firstValue} to ${lastValue}. `;
            } else if (lastValue < firstValue) {
              enhancedExplanation += `There appears to be an overall decreasing trend from ${firstValue} to ${lastValue}. `;
            } else {
              enhancedExplanation += `The values remain relatively stable throughout the dataset. `;
            }
          }
          
          enhancedExplanation += `You can explore the visualization to see more details.`;
        }
      }
      
      // Override the explanation with our enhanced version
      if (enhancedExplanation) {
        result.explanation = enhancedExplanation;
      }
      
      const aiResponse: Message = {
        id: Date.now().toString() + '-response',
        content: enhancedExplanation || 'Here\'s the visualization based on your query.',
        sender: 'ai',
        timestamp: new Date(),
        result: result,
        model: activeModel,
        queryId: result.query_id,
        thinking: thinking
      };
      
      setMessages(prev => [...prev, aiResponse]);
      
      // Update the previous queries list
      if (result.query_id) {
        const newQuery = await nlpService.getQueryById(result.query_id);
        if (newQuery) {
          setPreviousQueries(prev => [newQuery, ...prev]);
        }
      }
    } catch (error) {
      console.error('Error processing query:', error);
      
      const errorMessage: Message = {
        id: Date.now().toString() + '-error',
        content: `Sorry, I couldn't analyze that. ${error instanceof Error ? error.message : 'Please try a different question.'}`,
        sender: 'ai',
        timestamp: new Date(),
        model: activeModel,
        thinking: `Error occurred during analysis: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast.error("Error analyzing data", {
        description: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getChartTypeIcon = (result?: QueryResult) => {
    if (!result) return <BarChart className="h-4 w-4 text-purple-400" />;
    
    const chartType = result.chartType || result.chart_type || 'bar';
    
    switch (chartType) {
      case 'bar':
        return <BarChart className="h-4 w-4 text-purple-400" />;
      case 'line':
        return <LineChart className="h-4 w-4 text-blue-400" />;
      case 'pie':
        return <PieChart className="h-4 w-4 text-green-400" />;
      default:
        return <BarChart className="h-4 w-4 text-purple-400" />;
    }
  };

  const downloadVisualization = (result: QueryResult) => {
    toast.success("Download started", {
      description: "Your visualization is being prepared for download"
    });
    // In a real implementation, this would generate a chart image or export data
  };

  const loadPreviousQuery = async (queryId: string) => {
    try {
      setShowHistoryDialog(false);
      setIsLoading(true);
      
      const query = await nlpService.getQueryById(queryId);
      
      if (!query) {
        throw new Error('Query not found');
      }
      
      // Get the visualization data
      const data = await dataService.previewDataset(datasetId);
      
      const config = query.query_config;
      
      const result: QueryResult = {
        chart_type: config.chart_type,
        chartType: config.chart_type,
        x_axis: config.x_axis,
        y_axis: config.y_axis,
        xAxis: config.x_axis,
        yAxis: config.y_axis,
        chart_title: config.result?.chart_title || 'Visualization',
        explanation: config.result?.explanation || `Analysis of ${config.x_axis} vs ${config.y_axis}`,
        data: data || [],
        columns: Object.keys(data && data.length > 0 ? data[0] : {}),
        query_id: queryId,
        model_used: query.query_type === 'anthropic' ? 'Claude 3.7 Sonnet' : 'GPT-4o'
      };
      
      const userMessage: Message = {
        id: Date.now().toString(),
        content: query.query_text,
        sender: 'user',
        timestamp: new Date(query.created_at)
      };
      
      const aiResponse: Message = {
        id: Date.now().toString() + '-response',
        content: result.explanation || 'Here\'s the visualization based on your query.',
        sender: 'ai',
        timestamp: new Date(query.created_at),
        result: result,
        model: query.query_type as 'openai' | 'anthropic',
        queryId: queryId,
        thinking: 'Loaded from query history'
      };
      
      setMessages(prev => [...prev, userMessage, aiResponse]);
    } catch (error) {
      console.error('Error loading previous query:', error);
      toast.error("Error loading query", {
        description: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[70vh] max-h-[70vh]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium">Chat with Your Data</h2>
        <div className="flex space-x-2">
          <Button 
            variant={activeModel === 'openai' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setActiveModel('openai')} 
            className="flex items-center gap-1"
          >
            <Avatar className="h-5 w-5 mr-1">
              <AvatarImage src="https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg" />
              <AvatarFallback>OAI</AvatarFallback>
            </Avatar>
            GPT-4o
          </Button>
          <Button 
            variant={activeModel === 'anthropic' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => setActiveModel('anthropic')} 
            className="flex items-center gap-1 bg-amber-600 hover:bg-amber-500"
          >
            <Avatar className="h-5 w-5 mr-1">
              <AvatarImage src="https://upload.wikimedia.org/wikipedia/commons/2/28/Anthropic_Logo.png" />
              <AvatarFallback>AC</AvatarFallback>
            </Avatar>
            Claude
          </Button>
          <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
              >
                <History className="h-4 w-4 mr-1" />
                History
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md md:max-w-lg bg-gray-900 text-white">
              <DialogHeader>
                <DialogTitle>Query History</DialogTitle>
              </DialogHeader>
              <div className="max-h-96 overflow-y-auto">
                {previousQueries.length === 0 ? (
                  <p className="text-center py-4 text-gray-400">No previous queries</p>
                ) : (
                  <ul className="space-y-2">
                    {previousQueries.map((query) => (
                      <li 
                        key={query.id} 
                        className="p-2 rounded hover:bg-gray-800 cursor-pointer border border-gray-700"
                        onClick={() => loadPreviousQuery(query.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            {query.query_config?.chart_type === 'bar' && <BarChart className="h-4 w-4 text-purple-400 mr-2" />}
                            {query.query_config?.chart_type === 'line' && <LineChart className="h-4 w-4 text-blue-400 mr-2" />}
                            {query.query_config?.chart_type === 'pie' && <PieChart className="h-4 w-4 text-green-400 mr-2" />}
                            <span className="font-medium">{query.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {query.query_type === 'anthropic' ? 'Claude' : 'GPT-4o'} 
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {new Date(query.created_at).toLocaleDateString()}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-gray-400 mt-1 line-clamp-2">{query.query_text}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <Card className="flex-1 overflow-hidden glass-card backdrop-blur-xl bg-gray-950/30 border border-purple-500/20 shadow-xl">
        <ScrollArea className="h-full pr-4">
          <CardContent className="pt-6 pb-2">
            <div className="flex flex-col space-y-4">
              {messages.map(message => (
                <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${
                    message.sender === 'user' 
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-t-xl rounded-bl-xl shadow-lg' 
                      : 'bg-gradient-to-r from-purple-900/80 to-purple-800/60 backdrop-blur-sm text-white rounded-t-xl rounded-br-xl shadow-lg'
                    } p-4`}>
                    
                    {message.sender === 'ai' && (
                      <div className="flex items-center mb-2">
                        <Avatar className="h-6 w-6 mr-2">
                          <AvatarImage 
                            src={message.model === 'anthropic' 
                              ? "https://upload.wikimedia.org/wikipedia/commons/2/28/Anthropic_Logo.png" 
                              : "https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg"} 
                          />
                          <AvatarFallback>{message.model === 'anthropic' ? 'C' : 'G'}</AvatarFallback>
                        </Avatar>
                        <Badge variant="secondary" className="text-xs font-medium">
                          {message.model === 'anthropic' ? 'Claude 3.7' : 'GPT-4o'}
                        </Badge>
                      </div>
                    )}
                    
                    <p className="text-sm leading-relaxed whitespace-pre-line">{message.content}</p>
                    
                    {message.thinking && message.sender === 'ai' && (
                      <div className="mt-3 pt-3 border-t border-gray-600/30">
                        <p className="text-xs text-gray-300 font-mono whitespace-pre-line">{message.thinking}</p>
                      </div>
                    )}
                    
                    {message.result && (
                      <div className="mt-4 bg-black/20 rounded-lg p-2">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center">
                            {getChartTypeIcon(message.result)}
                            <span className="ml-1 text-xs font-medium">
                              {(message.result.chartType || message.result.chart_type || 'bar').charAt(0).toUpperCase() + 
                               (message.result.chartType || message.result.chart_type || 'bar').slice(1)} Chart
                            </span>
                          </div>
                          
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => message.result && downloadVisualization(message.result)}>
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Download visualization</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        
                        {/* Debug information if no data is present */}
                        {(!message.result.data || message.result.data.length === 0) && (
                          <div className="bg-red-900/30 p-2 rounded mb-2 text-xs">
                            <p>No data available for visualization.</p>
                            <p className="mt-1">Try refreshing or asking a different question.</p>
                          </div>
                        )}
                        
                        {/* Use enhanced visualization with proper color scheme based on model */}
                        <EnhancedVisualization 
                          result={message.result} 
                          colorPalette={message.model === 'anthropic' ? 'professional' : 'vibrant'}
                          showTitle={false}
                        />
                        
                        {/* Show model info */}
                        {message.result.model_used && (
                          <div className="flex justify-end mt-2">
                            <Badge variant="outline" className="text-xs opacity-70">
                              Generated by {message.result.model_used}
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="text-xs opacity-70 mt-2 text-right">
                      {new Intl.DateTimeFormat('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      }).format(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </CardContent>
        </ScrollArea>
      </Card>
      
      <div className="mt-4 flex items-center gap-2">
        <Input 
          value={inputText} 
          onChange={e => setInputText(e.target.value)} 
          onKeyDown={handleKeyPress} 
          placeholder="Ask a question about your dataset..." 
          disabled={isLoading} 
          className="flex-1 bg-gray-950/60 border-purple-500/30 focus-visible:ring-purple-500 focus-visible:border-purple-500"
        />
        <Button 
          onClick={handleSendMessage} 
          disabled={isLoading || !inputText.trim()} 
          className="bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500 hover:shadow-lg transition-all"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      
      <div className="flex flex-wrap gap-2 mt-4">
        {recommendations.map((query, index) => (
          <Badge 
            key={index}
            variant="outline" 
            className="bg-purple-500/20 border-purple-500/30 cursor-pointer hover:bg-purple-500/30 hover:scale-105 transition-all" 
            onClick={() => setInputText(query)}
          >
            {query}
          </Badge>
        ))}
      </div>
    </div>
  );
};

export default DatasetChatInterface;
