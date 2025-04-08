import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import ChartVisualization from '@/components/ChartVisualization';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TableIcon, 
  ChevronDown,
  BarChart, 
  LineChart, 
  PieChart, 
  CircleDot, 
  ArrowUpDown,
  CircleDashed, 
  Layers
} from 'lucide-react';
import DataTable from '@/components/DataTable';
import { dataService } from '@/services/dataService';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChartType, getSuitableChartTypes, getChartTypeName } from '@/utils/chartSuggestionUtils';
import { queryService } from '@/services/queryService';

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
  const [selectedChartType, setSelectedChartType] = useState<ChartType>('bar');
  const [dataPreview, setDataPreview] = useState<any[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [suitableChartTypes, setSuitableChartTypes] = useState<ChartType[]>([
    'bar', 'line', 'pie', 'column', 'area', 'scatter', 'bubble', 'donut', 'stacked', 'polar', 
    'gauge', 'heatmap', 'treemap', 'waterfall', 'funnel', 'sankey'
  ]);

  const effectiveDatasetId = datasetId || externalSelectedId || internalSelectedId;
  const isMultiDataset = Boolean(datasets && datasets.length > 0);
  const isLoading = externalLoading || false;

  React.useEffect(() => {
    if ((activeView === 'table' || activeView === 'chart') && effectiveDatasetId && !dataPreview) {
      loadDataPreview(effectiveDatasetId);
    }
  }, [activeView, effectiveDatasetId]);

  React.useEffect(() => {
    if (isMultiDataset && datasets && datasets.length > 0 && !effectiveDatasetId) {
      const firstId = datasets[0].id;
      if (externalSetSelectedId) {
        externalSetSelectedId(firstId);
      } else {
        setInternalSelectedId(firstId);
      }
    }
  }, [datasets, effectiveDatasetId, externalSetSelectedId, isMultiDataset]);

  useEffect(() => {
    if (dataPreview && dataPreview.length > 0) {
      const suggestedTypes = getSuitableChartTypes(dataPreview);
      
      const extendedTypes: ChartType[] = [
        'bar', 'line', 'pie', 'column', 'area', 'scatter', 'bubble', 'donut', 
        'stacked', 'polar', 'gauge', 'heatmap', 'treemap', 'waterfall', 'funnel', 'sankey'
      ];
      
      setSuitableChartTypes(extendedTypes);
      
      if (!suggestedTypes.includes(selectedChartType) && suggestedTypes.length > 0) {
        setSelectedChartType(suggestedTypes[0]);
      }
    }
  }, [dataPreview, selectedChartType]);

  const loadDataPreview = async (datasetId: string) => {
    setPreviewLoading(true);
    setPreviewError(null);
    
    try {
      console.log("Loading dataset preview for ID:", datasetId);
      
      const loadedData = await queryService.loadDataset(datasetId);
      
      if (loadedData && Array.isArray(loadedData) && loadedData.length > 0) {
        console.log(`Successfully loaded ${loadedData.length} rows using queryService.loadDataset`);
        setDataPreview(loadedData);
        setPreviewLoading(false);
        return;
      }
      
      const data = await dataService.previewDataset(datasetId);
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('No preview data available');
      }
      
      console.log(`Loaded ${data.length} rows with dataService.previewDataset`);
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
      navigate(`/visualize/${effectiveDatasetId}?view=chat`);
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
    setDataPreview(null);
  };

  const getChartIcon = (chartType: ChartType) => {
    switch (chartType) {
      case 'bar': return <BarChart className="h-4 w-4 mr-2" />;
      case 'line': return <LineChart className="h-4 w-4 mr-2" />;
      case 'pie': return <PieChart className="h-4 w-4 mr-2" />;
      case 'scatter': return <CircleDot className="h-4 w-4 mr-2" />;
      case 'area': return <ArrowUpDown className="h-4 w-4 mr-2" />;
      case 'column': return <BarChart className="h-4 w-4 mr-2" />;
      case 'donut': return <CircleDashed className="h-4 w-4 mr-2" />;
      case 'stacked': return <Layers className="h-4 w-4 mr-2" />;
      case 'polar': return <PieChart className="h-4 w-4 mr-2" />;
      case 'gauge': return <CircleDot className="h-4 w-4 mr-2" />;
      case 'heatmap': return <TableIcon className="h-4 w-4 mr-2" />;
      case 'table': return <TableIcon className="h-4 w-4 mr-2" />;
      default: return <BarChart className="h-4 w-4 mr-2" />;
    }
  };

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
                  {getChartIcon(selectedChartType)}
                  Chart View
                </TabsTrigger>
                <TabsTrigger value="table" className="flex items-center gap-1">
                  <TableIcon className="h-4 w-4" />
                  Table View
                </TabsTrigger>
              </TabsList>
              
              {activeView === 'chart' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="ml-4 flex items-center gap-2 bg-white/10">
                      {getChartIcon(selectedChartType)}
                      {getChartTypeName(selectedChartType)}
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 p-2 bg-gray-900/90 backdrop-blur-md border border-purple-500/30 max-h-[60vh] overflow-y-auto"
                  >
                    {suitableChartTypes.map((chartType) => (
                      <DropdownMenuItem
                        key={chartType}
                        onClick={() => setSelectedChartType(chartType)} 
                        className={`flex items-center hover:bg-purple-500/20 ${
                          chartType === selectedChartType ? 'bg-purple-500/30' : ''
                        }`}
                      >
                        {getChartIcon(chartType)}
                        {getChartTypeName(chartType)}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            
            <TabsContent value="chart" className="min-h-[500px]">
              {effectiveDatasetId && (
                <ChartVisualization 
                  datasetId={effectiveDatasetId} 
                  chartType={selectedChartType}
                  data={dataPreview}
                  heightClass="h-[500px]"
                />
              )}
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
              Talk to me
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default DatasetVisualizationCard;
