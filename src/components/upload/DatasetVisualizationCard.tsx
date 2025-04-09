
import React, { useState, useEffect, useMemo } from 'react';
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
import { toast } from 'sonner';
import { datasetUtils } from '@/utils/datasetUtils';
import { useAuth } from '@/hooks/useAuth';

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
  const { isAuthenticated, user } = useAuth();
  const [activeView, setActiveView] = useState<'chart' | 'table'>('chart');
  const [selectedChartType, setSelectedChartType] = useState<ChartType>('bar');
  const [dataPreview, setDataPreview] = useState<any[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [suitableChartTypes, setSuitableChartTypes] = useState<ChartType[]>([
    'bar', 'line', 'pie', 'column', 'area', 'scatter', 'bubble', 'donut', 'stacked'
  ]);

  const effectiveDatasetId = datasetId || externalSelectedId || internalSelectedId;
  const isMultiDataset = Boolean(datasets && datasets.length > 0);
  const isLoading = externalLoading || false;

  useEffect(() => {
    if ((activeView === 'table' || activeView === 'chart') && effectiveDatasetId && !dataPreview) {
      loadDataPreview(effectiveDatasetId);
    }
  }, [activeView, effectiveDatasetId]);

  useEffect(() => {
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
        'bar', 'line', 'pie', 'column', 'area', 'scatter', 'bubble', 'donut', 'stacked'
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
    setLoadAttempt(prev => prev + 1);
    
    try {
      console.log("Loading dataset preview for ID:", datasetId);
      
      // Only allow real data for authenticated users
      const preventSampleFallback = isAuthenticated;
      
      // First attempt: Use datasetUtils which has better caching
      try {
        const loadedData = await datasetUtils.loadDatasetContent(datasetId, {
          showToasts: false,
          limitRows: 5000,
          preventSampleFallback: preventSampleFallback
        });
        
        if (loadedData && Array.isArray(loadedData) && loadedData.length > 0) {
          console.log(`Successfully loaded ${loadedData.length} rows using datasetUtils`);
          setDataPreview(loadedData);
          setPreviewLoading(false);
          return;
        } else if (preventSampleFallback) {
          throw new Error("Unable to load dataset and sample data is disabled for authenticated users");
        }
      } catch (error) {
        console.warn("Failed to load with datasetUtils, falling back to dataService:", error);
        
        if (preventSampleFallback && isAuthenticated) {
          toast.error("Failed to load dataset", {
            description: "Please check your connection and try again"
          });
          throw error; // Re-throw to prevent further fallbacks to sample data
        }
      }
      
      // Second attempt: Use standard dataService
      const data = await dataService.previewDataset(datasetId);
      
      if (data && Array.isArray(data) && data.length > 0) {
        console.log(`Loaded ${data.length} rows with dataService.previewDataset`);
        setDataPreview(data);
        setPreviewLoading(false);
        return;
      }
      
      // If we're here and user is authenticated, don't use sample data
      if (isAuthenticated) {
        throw new Error("Could not load dataset. Please check your connection or contact support.");
      }
      
      // For unauthenticated users only - generate sample data
      const dataset = await dataService.getDataset(datasetId);
      if (dataset?.file_name && dataset?.column_schema) {
        const sampleData = generateSampleData(dataset.column_schema, 100);
        setDataPreview(sampleData);
        console.log("Generated sample data based on schema:", sampleData.length, "rows");
        toast.info("Using generated sample data for visualization", {
          description: "The actual dataset could not be loaded"
        });
      } else {
        throw new Error('Could not load dataset or generate sample data');
      }
    } catch (error) {
      console.error('Error loading data preview:', error);
      setPreviewError('Failed to load data preview. Please try again.');
      
      // Try one more fallback option if we have schema and user is not authenticated
      if (!isAuthenticated) {
        try {
          const dataset = await dataService.getDataset(datasetId);
          if (dataset?.file_name) {
            toast.warning("Using generated data for visualization");
            const sampleData = generateSampleDataFromFilename(dataset.file_name, 100);
            setDataPreview(sampleData);
            setPreviewError(null);
          }
        } catch (fallbackError) {
          console.error("Error in fallback data generation:", fallbackError);
        }
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const generateSampleDataFromFilename = (filename: string, count: number): any[] => {
    // Only run for non-authenticated users
    if (isAuthenticated) {
      toast.error("Cannot generate sample data for authenticated users");
      throw new Error("Sample data generation is disabled for authenticated users");
    }
    
    const lowerName = filename.toLowerCase();
    const data = [];
    
    for (let i = 0; i < count; i++) {
      if (lowerName.includes('vehicle') || lowerName.includes('car')) {
        data.push({
          id: i + 1,
          make: ['Tesla', 'Nissan', 'Chevrolet', 'Ford', 'BMW'][i % 5],
          model: ['Model S', 'Leaf', 'Bolt', 'Mach-E', 'i3'][i % 5],
          year: 2020 + (i % 5),
          price: 30000 + (i % 10) * 5000,
          type: ['BEV', 'PHEV'][i % 2],
          range: 200 + (i % 10) * 30
        });
      } else {
        data.push({
          id: i + 1,
          name: `Item ${i + 1}`,
          value: Math.floor(Math.random() * 1000),
          category: ['A', 'B', 'C'][i % 3],
          date: new Date(2023, i % 12, (i % 28) + 1).toISOString().split('T')[0]
        });
      }
    }
    
    return data;
  };

  const generateSampleData = (schema: Record<string, string>, count: number): any[] => {
    // Only run for non-authenticated users
    if (isAuthenticated) {
      toast.error("Cannot generate sample data for authenticated users");
      throw new Error("Sample data generation is disabled for authenticated users");
    }
    
    const data = [];
    const fields = Object.keys(schema);
    
    for (let i = 0; i < count; i++) {
      const row: Record<string, any> = {};
      
      fields.forEach(field => {
        const type = schema[field];
        
        switch (type) {
          case 'number':
            row[field] = Math.floor(Math.random() * 1000);
            break;
          case 'boolean':
            row[field] = Math.random() > 0.5;
            break;
          case 'date':
            const date = new Date(2023, i % 12, (i % 28) + 1);
            row[field] = date.toISOString().split('T')[0];
            break;
          default:
            // string or other type
            if (field.toLowerCase().includes('name')) {
              row[field] = `Name ${i + 1}`;
            } else if (field.toLowerCase().includes('email')) {
              row[field] = `user${i}@example.com`;
            } else if (field.toLowerCase().includes('city')) {
              row[field] = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'][i % 5];
            } else if (field.toLowerCase().includes('country')) {
              row[field] = ['USA', 'Canada', 'UK', 'Germany', 'Japan'][i % 5];
            } else {
              row[field] = `Value ${i + 1}`;
            }
        }
      });
      
      data.push(row);
    }
    
    return data;
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

  const handleRefreshData = () => {
    if (effectiveDatasetId) {
      setDataPreview(null);
      loadDataPreview(effectiveDatasetId);
    }
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
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshData}
                  className="bg-white/10"
                >
                  Refresh Data
                </Button>
              
                {activeView === 'chart' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2 bg-white/10">
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
            </div>
            
            <TabsContent value="chart" className="min-h-[500px]">
              {previewLoading ? (
                <div className="flex justify-center items-center h-[400px]">
                  <div className="animate-spin h-8 w-8 border-t-2 border-primary rounded-full" />
                </div>
              ) : previewError ? (
                <div className="flex flex-col justify-center items-center h-[400px] text-center">
                  <p className="text-red-400 mb-4">{previewError}</p>
                  <Button onClick={() => loadDataPreview(effectiveDatasetId || '')}>
                    Try Again
                  </Button>
                </div>
              ) : effectiveDatasetId && dataPreview ? (
                <ChartVisualization 
                  datasetId={effectiveDatasetId} 
                  chartType={selectedChartType}
                  data={dataPreview}
                  heightClass="h-[500px]"
                />
              ) : (
                <div className="flex justify-center items-center h-[400px]">
                  <p>Select a dataset to visualize</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="table">
              <div className="mb-4">
                {previewLoading ? (
                  <div className="flex justify-center items-center h-[400px]">
                    <div className="animate-spin h-8 w-8 border-t-2 border-primary rounded-full" />
                  </div>
                ) : (
                  <DataTable 
                    datasetId={effectiveDatasetId}
                    data={dataPreview} 
                    loading={previewLoading} 
                    error={previewError}
                    title="Data Preview"
                    pageSize={5}
                  />
                )}
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
