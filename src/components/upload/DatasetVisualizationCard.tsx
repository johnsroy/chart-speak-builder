
import React from 'react';
import { Button } from '@/components/ui/button';
import ChartVisualization from '@/components/ChartVisualization';
import { useNavigate } from 'react-router-dom';

interface DatasetVisualizationCardProps {
  datasetId: string;
  onHideClick: () => void;
}

const DatasetVisualizationCard: React.FC<DatasetVisualizationCardProps> = ({
  datasetId,
  onHideClick,
}) => {
  const navigate = useNavigate();

  const handleExploreClick = () => {
    navigate(`/visualize/${datasetId}`);
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
