
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import ChartVisualization from '@/components/ChartVisualization';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, TableIcon } from 'lucide-react';
import DataTable from '@/components/DataTable';
import { dataService } from '@/services/dataService';

export interface DatasetVisualizationCardProps {
  datasetId?: string;
  datasets?: any[];
  isLoading?: boolean;
  selectedDatasetId?: string | null;
  setSelectedDatasetId?: (id: string | null) => void;
  onHideClick?: () => void;
  onExploreClick?: () => void;
  setActiveTab?: (tab: string) => void;
}

const DatasetVisualizationCard: React.FC<DatasetVisualizationCardProps> = ({
  datasetId,
  datasets,
  isLoading: externalLoading,
  selectedDatasetId: externalSelectedId,
  setSelectedDatasetId: externalSetSelectedId,
  onHideClick,
  onExploreClick,
  setActiveTab
}) => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'chart' | 'table'>('chart');
  const [dataPreview, setDataPreview] = useState<any[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);

  // Determine which dataset ID to use
  const effectiveDatasetId = datasetId || externalSelectedId || internalSelectedId;
  const isMultiDataset = Boolean(datasets && datasets.length > 0);
  const isLoading = externalLoading || false;

  React.useEffect(() => {
    if (activeView === 'table' && effectiveDatasetId && !dataPreview) {
      loadDataPreview(effectiveDatasetId);
    }
  }, [activeView, effectiveDatasetId]);

  React.useEffect(() => {
    // If we have datasets but no selection, select the first one
    if (isMultiDataset && datasets && datasets.length > 0 && !effectiveDatasetId) {
      const firstId = datasets[0].id;
      if (externalSetSelectedId) {
        externalSetSelectedId(firstId);
      } else {
        setInternalSelectedId(firstId);
      }
    }
  }, [datasets, effectiveDatasetId, externalSetSelectedId, isMultiDataset]);

  const loadDataPreview = async (datasetId: string) => {
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
    } else if (effectiveDatasetId) {
      navigate(`/visualize/${effectiveDatasetId}`);
    }
  };

  const handleHideClick = () => {
    if (onHideClick) {
      onHideClick();
    } else if (setActiveTab) {
      setActiveTab('upload');
    }
  };

  const handleDatasetSelect = (id: string) => {
    if (externalSetSelectedId) {
      externalSetSelectedId(id);
    } else {
      setInternalSelectedId(id);
    }
    setDataPreview(null); // Reset preview when changing dataset
  };

  // Handle the case where we're asked to visualize with no dataset
  if (!effectiveDatasetId && !isMultiDataset) {
    return (
      <div className="glass-card p-6">
        <h2 className="text-xl font-medium mb-4 text-left">Dataset Visualization</h2>
        <p className="text-gray-300">No dataset selected for visualization. Please upload or select a dataset.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h2 className="text-xl font-medium mb-4 text-left">Dataset Visualization</h2>
      
      {/* Multi-dataset selector */}
      {isMultiDataset && datasets && datasets.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto">
          {datasets.map(dataset => (
            <button 
              key={dataset.id} 
              className={`px-3 py-2 rounded-md text-sm ${effectiveDatasetId === dataset.id ? 'bg-primary text-white' : 'bg-white/20 hover:bg-white/30'}`} 
              onClick={() => handleDatasetSelect(dataset.id)}
            >
              {dataset.name}
            </button>
          ))}
        </div>
      )}
      
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="animate-pulse">Loading visualization...</div>
        </div>
      ) : (
        <>
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
              {effectiveDatasetId && <ChartVisualization datasetId={effectiveDatasetId} />}
            </TabsContent>
            
            <TabsContent value="table">
              <div className="mb-4">
                <DataTable 
                  datasetId={effectiveDatasetId}
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
              onClick={handleHideClick} 
              className="mr-2"
            >
              Hide Visualization
            </Button>
            <Button onClick={handleExploreClick}>
              Explore More
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default DatasetVisualizationCard;
