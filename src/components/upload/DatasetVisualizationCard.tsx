
import React from 'react';
import { Button } from '@/components/ui/button';
import ChartVisualization from '@/components/ChartVisualization';
import { useNavigate } from 'react-router-dom';

interface DatasetVisualizationCardProps {
  datasetId: string;
  onHideClick: () => void;
  onExploreClick?: () => void; // Making this optional with a default implementation
}

const DatasetVisualizationCard: React.FC<DatasetVisualizationCardProps> = ({
  datasetId,
  onHideClick,
  onExploreClick,
}) => {
  const navigate = useNavigate();

  const handleExploreClick = () => {
    if (onExploreClick) {
      onExploreClick();
    } else {
      navigate(`/visualize/${datasetId}`);
    }
  };

  return (
    <div className="glass-card p-6">
      <h2 className="text-xl font-medium mb-4 text-left">Dataset Visualization</h2>
      <ChartVisualization datasetId={datasetId} />
      <div className="mt-6 flex justify-center">
        <Button 
          variant="outline" 
          onClick={onHideClick} 
          className="mr-2"
        >
          Hide Visualization
        </Button>
        <Button onClick={handleExploreClick}>
          Explore More
        </Button>
      </div>
    </div>
  );
};

export default DatasetVisualizationCard;
