
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AIModelType } from './types';

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
          <SelectItem value="openai">GPT-4o</SelectItem>
          <SelectItem value="anthropic">Claude 3.7</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default ModelSelector;
