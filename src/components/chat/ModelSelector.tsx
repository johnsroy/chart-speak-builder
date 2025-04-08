
import React from 'react';
import { Button } from "@/components/ui/button";
import { History } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface ModelSelectorProps {
  activeModel: 'openai' | 'anthropic';
  setActiveModel: (model: 'openai' | 'anthropic') => void;
  previousQueries: any[];
  showHistoryDialog: boolean;
  setShowHistoryDialog: (show: boolean) => void;
  loadPreviousQuery: (queryId: string) => Promise<void>;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  activeModel,
  setActiveModel,
  previousQueries,
  showHistoryDialog,
  setShowHistoryDialog,
  loadPreviousQuery,
}) => {
  return (
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
                        {query.query_config?.chart_type === 'bar' && <BarChartIcon className="h-4 w-4 text-purple-400 mr-2" />}
                        {query.query_config?.chart_type === 'line' && <LineChartIcon className="h-4 w-4 text-blue-400 mr-2" />}
                        {query.query_config?.chart_type === 'pie' && <PieChartIcon className="h-4 w-4 text-green-400 mr-2" />}
                        <span className="font-medium">{query.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs font-medium">
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
  );
};

// Define lucide-react icons as components to avoid direct imports
const BarChartIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="12" y1="20" x2="12" y2="10"></line>
    <line x1="18" y1="20" x2="18" y2="4"></line>
    <line x1="6" y1="20" x2="6" y2="16"></line>
  </svg>
);

const LineChartIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 3v18h18"></path>
    <path d="m19 9-5 5-4-4-3 3"></path>
  </svg>
);

const PieChartIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path>
    <path d="M22 12A10 10 0 0 0 12 2v10z"></path>
  </svg>
);

export default ModelSelector;
