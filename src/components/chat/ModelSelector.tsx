
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AIModelType } from './types';
import { Sparkles, BrainCircuit } from 'lucide-react';

export interface ModelSelectorProps {
  currentModel: AIModelType;
  onModelChange: (model: AIModelType) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ currentModel, onModelChange }) => {
  return (
    <div className="flex items-center">
      <Select
        value={currentModel}
        onValueChange={(value) => onModelChange(value as AIModelType)}
      >
        <SelectTrigger className="w-[180px] h-9 bg-gray-950/50 border-gray-700">
          <SelectValue placeholder="Select model" />
        </SelectTrigger>
        <SelectContent className="bg-gray-900 border-gray-700 text-white">
          <SelectItem value="openai" className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <span>GPT-4o</span>
            </div>
          </SelectItem>
          <SelectItem value="anthropic" className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-4 w-4 text-violet-400" />
              <span>Claude 3.7</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default ModelSelector;
