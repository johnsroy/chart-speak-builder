import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, BarChart, LineChart, PieChart, Download, History } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { QueryResult } from '@/services/types/queryTypes';
import { nlpService } from '@/services/nlpService';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();

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
        timestamp: new Date()
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
      const result = await nlpService.processQuery(inputText, datasetId, activeModel);
      
      const aiResponse: Message = {
        id: Date.now().toString() + '-response',
        content: result.explanation || 'Here\'s the visualization based on your query.',
        sender: 'ai',
        timestamp: new Date(),
        result: result,
        model: activeModel,
        queryId: result.query_id
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
        model: activeModel
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error analyzing data",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: "destructive"
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
    toast({
      title: "Download started",
      description: "Your visualization is being downloaded"
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
        query_id: queryId
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
        queryId: queryId
      };
      
      setMessages(prev => [...prev, userMessage, aiResponse]);
    } catch (error) {
      console.error('Error loading previous query:', error);
      toast({
        title: "Error loading query",
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: "destructive"
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
                          <Badge variant="outline" className="text-xs">
                            {new Date(query.created_at).toLocaleDateString()}
                          </Badge>
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
      
      <Card className="flex-1 overflow-hidden glass-card backdrop-blur-xl bg-gray-950/30 border border-purple-500/20">
        <ScrollArea className="h-full pr-4">
          <CardContent className="pt-6 pb-2">
            <div className="flex flex-col space-y-4">
              {messages.map(message => (
                <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${
                    message.sender === 'user' 
                      ? 'bg-gradient-to-r from-blue-600/80 to-blue-500/70 text-white rounded-t-xl rounded-bl-xl' 
                      : 'bg-gradient-to-r from-purple-900/70 to-purple-800/50 backdrop-blur-sm text-white rounded-t-xl rounded-br-xl'
                    } p-3 shadow-md`}>
                    
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
                        <Badge variant="outline" className="text-xs font-medium border-purple-500/40 bg-purple-500/20">
                          {message.model === 'anthropic' ? 'Claude 3.7' : 'GPT-4o'}
                        </Badge>
                      </div>
                    )}
                    
                    <p className="text-sm">{message.content}</p>
                    
                    {message.result && (
                      <div className="mt-4">
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
                        <EnhancedVisualization result={message.result} />
                      </div>
                    )}
                    
                    <div className="text-xs opacity-70 mt-1">
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
          className="flex-1 bg-gray-950 border-purple-500/30 focus:border-purple-500" 
        />
        <Button 
          onClick={handleSendMessage} 
          disabled={isLoading || !inputText.trim()} 
          className="bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
      
      <div className="flex flex-wrap gap-2 mt-4">
        {recommendations.map((query, index) => (
          <Badge 
            key={index}
            variant="outline" 
            className="bg-purple-500/20 border-purple-500/30 cursor-pointer hover:bg-purple-500/30" 
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
