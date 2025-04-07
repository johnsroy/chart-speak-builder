
import React from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface VisualizeDatasetPanelProps {
  datasets: { id: string }[];
  showVisualize: boolean;
  setShowVisualize: (show: boolean) => void;
  onVisualizeClick?: () => void;
}

const VisualizeDatasetPanel: React.FC<VisualizeDatasetPanelProps> = ({
  datasets,
  showVisualize,
  setShowVisualize,
  onVisualizeClick
}) => {
  const navigate = useNavigate();

  const handleTalkToDataClick = () => {
    if (datasets.length > 0) {
      navigate(`/visualize/${datasets[0].id}?view=chat`);
    } else if (onVisualizeClick) {
      onVisualizeClick();
    }
  };
  
  return (
    <div className="glass-card p-6">
      <h2 className="text-xl font-medium mb-4 text-left">Dataset Visualization Settings</h2>
      
      <div className="flex items-center space-x-2 mb-4">
        <Switch
          id="visualize-after-upload"
          checked={showVisualize}
          onCheckedChange={setShowVisualize}
        />
        <Label htmlFor="visualize-after-upload">
          Show visualization after upload
        </Label>
      </div>
      
      {datasets.length > 0 ? (
        <div className="mt-6">
          <h3 className="text-lg font-medium mb-2">Selected Dataset</h3>
          <p className="text-sm text-gray-300 mb-4">
            Dataset ID: {datasets[0].id}
          </p>
          <Button onClick={handleTalkToDataClick} className="flex items-center gap-2 bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-600 hover:to-indigo-500">
            <MessageSquare className="h-4 w-4" />
            Talk to me
          </Button>
        </div>
      ) : (
        <div className="mt-6 text-center py-8 text-gray-400">
          <p>No dataset selected</p>
        </div>
      )}
    </div>
  );
};

export default VisualizeDatasetPanel;
