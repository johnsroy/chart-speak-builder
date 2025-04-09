
import React from 'react';
import { AIModelType } from './types';
import { Button } from '@/components/ui/button';
import { Check, Bot } from 'lucide-react';

export interface ModelSelectorProps {
  currentModel: AIModelType;
  onModelChange: (model: AIModelType) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ currentModel, onModelChange }) => {
  return (
    <div className="flex items-center gap-2 bg-black/20 rounded-lg p-1">
      <Button
        size="sm"
        variant={currentModel === 'openai' ? 'default' : 'outline'}
        className={`flex items-center ${currentModel === 'openai' ? 'bg-primary' : 'bg-transparent'}`}
        onClick={() => onModelChange('openai')}
      >
        {currentModel === 'openai' && <Check className="mr-1 h-4 w-4" />}
        <Bot className="mr-1 h-4 w-4" /> GPT
      </Button>
      <Button
        size="sm"
        variant={currentModel === 'anthropic' ? 'default' : 'outline'}
        className={`flex items-center ${currentModel === 'anthropic' ? 'bg-primary' : 'bg-transparent'}`}
        onClick={() => onModelChange('anthropic')}
      >
        {currentModel === 'anthropic' && <Check className="mr-1 h-4 w-4" />}
        <Bot className="mr-1 h-4 w-4" /> Claude
      </Button>
    </div>
  );
};

export default ModelSelector;
