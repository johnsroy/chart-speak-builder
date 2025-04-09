
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { SendHorizontal, Sparkles } from 'lucide-react';

export interface ChatInputProps {
  onSendMessage: (message: string) => Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  suggestions?: string[];
  onSuggestionSelect?: (query: string) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  isLoading = false, 
  placeholder = "Ask a question...",
  suggestions = [],
  onSuggestionSelect
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      const trimmedMessage = message.trim();
      setMessage('');
      await onSendMessage(trimmedMessage);
      
      // Focus back on the textarea after sending
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  useEffect(() => {
    // Auto-resize the textarea as the user types
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  return (
    <div className="bg-black/30 backdrop-blur-sm border border-gray-800 rounded-lg p-2 mt-auto">
      {suggestions && suggestions.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {suggestions.slice(0, 3).map((suggestion, index) => (
            <Button
              key={index}
              size="sm"
              variant="secondary"
              className="text-xs py-1 h-auto truncate max-w-[200px] flex items-center"
              onClick={() => onSuggestionSelect && onSuggestionSelect(suggestion)}
            >
              <Sparkles className="h-3 w-3 mr-1 text-primary" />
              {suggestion}
            </Button>
          ))}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            className="resize-none w-full bg-transparent border-0 focus:ring-0 focus:outline-none text-white p-2 pr-10 max-h-32 overflow-y-auto"
            disabled={isLoading}
          />
        </div>
        <Button 
          type="submit" 
          size="icon" 
          disabled={isLoading || !message.trim()} 
          className={`${message.trim() ? 'bg-primary hover:bg-primary/90' : 'bg-gray-700'} transition-colors rounded-full h-10 w-10 flex items-center justify-center flex-shrink-0`}
        >
          <SendHorizontal className="h-5 w-5" />
        </Button>
      </form>
    </div>
  );
};

export default ChatInput;
