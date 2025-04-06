
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import ChartVisualization from '@/components/ChartVisualization';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, TableIcon } from 'lucide-react';
import DataTable from '@/components/DataTable';
import { dataService } from '@/services/dataService';

export interface DatasetVisualizationCardProps {
  datasetId: string;
  onHideClick: () => void;
  onExploreClick?: () => void;
}

const DatasetVisualizationCard: React.FC<DatasetVisualizationCardProps> = ({
  datasetId,
  onHideClick,
  onExploreClick,
}) => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'chart' | 'table'>('chart');
  const [dataPreview, setDataPreview] = useState<any[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  React.useEffect(() => {
    if (activeView === 'table' && !dataPreview) {
      loadDataPreview();
    }
  }, [activeView]);

  const loadDataPreview = async () => {
    setPreviewLoading(true);
    setPreviewError(null);
    
    try {
      console.log("Loading dataset preview for ID:", datasetId);
      const data = await dataService.previewDataset(datasetId);
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No preview data available');
      }
      
      setDataPreview(data);
    } catch (error) {
      console.error('Error loading data preview:', error);
      setPreviewError('Failed to load data preview');
    } finally {
      setPreviewLoading(false);
    }
  };

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
      
      <Tabs defaultValue="chart" onValueChange={(value) => setActiveView(value as 'chart' | 'table')} className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="chart" className="flex items-center gap-1">
              <BarChart className="h-4 w-4" />
              Chart View
            </TabsTrigger>
            <TabsTrigger value="table" className="flex items-center gap-1">
              <TableIcon className="h-4 w-4" />
              Table View
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="chart">
          <ChartVisualization datasetId={datasetId} />
        </TabsContent>
        
        <TabsContent value="table">
          <div className="mb-4">
            <DataTable 
              data={dataPreview} 
              loading={previewLoading} 
              error={previewError}
              title="Data Preview"
              pageSize={5}
            />
          </div>
        </TabsContent>
      </Tabs>
      
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
