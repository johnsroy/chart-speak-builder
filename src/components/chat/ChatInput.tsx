
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  recommendations: string[];
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  isLoading,
  recommendations,
  disabled = false
}) => {
  const [inputText, setInputText] = useState('');

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    await onSendMessage(inputText);
    setInputText('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Input 
          value={inputText} 
          onChange={e => setInputText(e.target.value)} 
          onKeyDown={handleKeyPress} 
          placeholder="Ask a question about your dataset..." 
          disabled={isLoading || disabled} 
          className="flex-1 bg-gray-950/60 border-purple-500/30 focus-visible:ring-purple-500 focus-visible:border-purple-500"
        />
        <Button 
          onClick={handleSendMessage} 
          disabled={isLoading || disabled || !inputText.trim()} 
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
    </>
  );
};

export default ChatInput;
