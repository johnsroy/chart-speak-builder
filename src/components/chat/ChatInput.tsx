
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SendHorizontal, Sparkles } from 'lucide-react';

export interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  recommendations?: string[];
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  isLoading = false,
  recommendations = [],
  disabled = false
}) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading && !disabled) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleRecommendationClick = (recommendation: string) => {
    if (!isLoading && !disabled) {
      onSendMessage(recommendation);
    }
  };
  
  // Focus the input field when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <div>
      {recommendations.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {recommendations.map((rec, index) => (
            <button
              key={index}
              onClick={() => handleRecommendationClick(rec)}
              className="text-xs bg-purple-950/30 hover:bg-purple-900/40 text-purple-200 py-1 px-3 rounded-full border border-purple-800/50 transition-colors flex items-center"
              disabled={isLoading || disabled}
            >
              <Sparkles className="h-3 w-3 mr-1 text-purple-400" />
              {rec}
            </button>
          ))}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          ref={inputRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ask something about your data..."
          className="flex-1 bg-black/20 border-gray-800 focus:border-purple-500/70"
          disabled={isLoading || disabled}
        />
        <Button 
          type="submit" 
          size="icon"
          disabled={!message.trim() || isLoading || disabled}
          className="bg-purple-700 hover:bg-purple-600"
        >
          <SendHorizontal className="h-5 w-5" />
          <span className="sr-only">Send message</span>
        </Button>
      </form>
    </div>
  );
};

export default ChatInput;
