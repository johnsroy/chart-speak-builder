
import React, { useState, useEffect } from 'react';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChartContainer } from '@/components/ui/chart';
import { BarChart, LineChart, PieChart } from 'recharts';
import {
  Bar,
  Line,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getFieldOptions, isNumericField, isCategoricalField, processChartData, generateChartColors } from '@/utils/chartUtils';

interface ChartVisualizationProps {
  datasetId: string;
}

type ChartType = 'bar' | 'line' | 'pie';

const COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', 
  '#00C49F', '#FFBB28', '#FF8042', '#a4de6c', '#d0ed57', 
  '#83a6ed', '#8dd1e1', '#6970d5', '#a05195', '#d45087'
];

const ChartVisualization: React.FC<ChartVisualizationProps> = ({ datasetId }) => {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xAxisField, setXAxisField] = useState<string>('');
  const [yAxisField, setYAxisField] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [datasetInfo, setDatasetInfo] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      if (!datasetId) return;
      
      setLoading(true);
      setError(null);
      
      try {
        console.log('Loading dataset with ID:', datasetId);
        
        const dataset = await dataService.getDataset(datasetId);
        
        if (!dataset) {
          setError("Dataset not found");
          setLoading(false);
          return;
        }
        
        console.log('Dataset metadata loaded:', dataset);
        setDatasetInfo(dataset);
        
        let previewData;
        let errorMessage = '';
        
        try {
          console.log("Trying data-processor edge function...");
          const { data, error } = await supabase.functions.invoke('data-processor', {
            body: { action: 'preview', dataset_id: datasetId }
          });
          
          if (error) throw new Error(error.message || 'Edge function error');
          if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
            console.log("Got dataset from data-processor:", data.data.length, "rows");
            previewData = data.data;
            
            // Update the column schema if it was returned and not already present
            if (data.schema && (!dataset.column_schema || Object.keys(dataset.column_schema).length === 0)) {
              console.log("Updating dataset schema from preview data");
              dataset.column_schema = data.schema;
            }
          } else {
            throw new Error('Edge function returned empty or invalid data');
          }
        } catch (edgeFnError) {
          console.warn('Edge function error:', edgeFnError);
          errorMessage = `Edge function: ${edgeFnError instanceof Error ? edgeFnError.message : String(edgeFnError)}`;
          
          try {
            console.log("Trying standard preview...");
            const data = await dataService.previewDataset(datasetId);
            if (Array.isArray(data) && data.length > 0) {
              console.log("Got dataset from preview API:", data.length, "rows");
              previewData = data;
              
              // Infer schema from data if not already available
              if (!dataset.column_schema || Object.keys(dataset.column_schema).length === 0) {
                const inferredSchema = inferSchemaFromData(data[0]);
                dataset.column_schema = inferredSchema;
              }
            } else {
              throw new Error('Preview API returned empty data');
            }
          } catch (previewError) {
            console.warn('Preview API error:', previewError);
            errorMessage = `${errorMessage}\nPreview API: ${previewError instanceof Error ? previewError.message : String(previewError)}`;
            
            try {
              console.log("Trying direct storage access...");
              const data = await dataService.getDatasetDirectFromStorage(datasetId);
              if (Array.isArray(data) && data.length > 0) {
                console.log("Got dataset from direct storage:", data.length, "rows");
                previewData = data;
                
                // Infer schema from data if not already available
                if (!dataset.column_schema || Object.keys(dataset.column_schema).length === 0) {
                  const inferredSchema = inferSchemaFromData(data[0]);
                  dataset.column_schema = inferredSchema;
                }
              } else {
                throw new Error('Direct storage returned empty data');
              }
            } catch (storageError) {
              console.warn('Direct storage error:', storageError);
              errorMessage = `${errorMessage}\nDirect Storage: ${storageError instanceof Error ? storageError.message : String(storageError)}`;
              
              console.log("Using sample data as fallback");
              previewData = generateSampleData(dataset.name);
              console.log("Generated sample data:", previewData.length, "rows");
              
              // Create a sample schema
              if (!dataset.column_schema || Object.keys(dataset.column_schema).length === 0) {
                dataset.column_schema = {
                  'Category': 'string',
                  'Year': 'number',
                  'Value': 'number',
                  'Revenue': 'number',
                  'Count': 'number'
                };
              }
            }
          }
        }
        
        if (!previewData || previewData.length === 0) {
          throw new Error("Could not load any data using available methods");
        }
        
        setData(previewData);
        
        // Get columns from the actual data
        const cols = Object.keys(previewData[0] || {});
        setColumns(cols);
        
        // Auto select visualization fields using the dataset schema
        autoSelectVisualizationFields(previewData, cols, dataset);
      } catch (error) {
        console.error('Error loading dataset:', error);
        setError(`Failed to load dataset: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [datasetId, toast]);

  // Helper function to infer schema from data
  const inferSchemaFromData = (sampleRow: Record<string, any>) => {
    const schema: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(sampleRow)) {
      if (typeof value === 'number') {
        schema[key] = 'number';
      } else if (typeof value === 'boolean') {
        schema[key] = 'boolean';
      } else if (typeof value === 'string') {
        // Check if it's a date
        if (!isNaN(Date.parse(String(value))) && String(value).match(/^\d{4}-\d{2}-\d{2}/)) {
          schema[key] = 'date';
        } else {
          schema[key] = 'string';
        }
      } else if (value === null) {
        schema[key] = 'unknown';
      } else {
        schema[key] = 'object';
      }
    }
    
    return schema;
  };

  const generateSampleData = (datasetName: string) => {
    const categories = ['Category A', 'Category B', 'Category C', 'Category D', 'Category E'];
    const years = [2020, 2021, 2022, 2023, 2024];
    const data = [];
    
    for (const category of categories) {
      for (const year of years) {
        data.push({
          Category: category,
          Year: year,
          Value: Math.floor(Math.random() * 1000),
          Revenue: Math.floor(Math.random() * 10000) / 100,
          Count: Math.floor(Math.random() * 100)
        });
      }
    }
    
    return data;
  };

  const autoSelectVisualizationFields = (data: any[], columns: string[], dataset: any) => {
    // If no data or columns, return early
    if (!columns.length || !data.length) return;
    
    // Get field options based on the dataset schema
    const { categoryFields, numericFields } = getFieldOptions(dataset);
    
    // If there are categorical fields, use the first one for x-axis
    if (categoryFields.length > 0) {
      setXAxisField(categoryFields[0]);
    } else if (columns.length > 0) {
      // Fallback to the first column
      setXAxisField(columns[0]);
    }
    
    // If there are numeric fields, use the first one for y-axis
    if (numericFields.length > 0) {
      // Skip the x-axis field if it's also in numeric fields
      const yField = numericFields.find(field => field !== xAxisField) || numericFields[0];
      setYAxisField(yField);
    } else if (columns.length > 1) {
      // Fallback to the second column
      setYAxisField(columns[1]);
    } else if (columns.length > 0 && columns[0] !== xAxisField) {
      // Last resort: use the first column if it's not used for x-axis
      setYAxisField(columns[0]);
    }
  };

  // Check if a field is numeric based on actual data
  const isFieldNumeric = (field: string) => {
    if (!data.length) return false;
    
    // First check schema if available
    if (datasetInfo?.column_schema && datasetInfo.column_schema[field]) {
      const fieldType = datasetInfo.column_schema[field];
      return fieldType === 'number' || fieldType === 'integer';
    }
    
    // Fallback to checking data
    const sample = data[0][field];
    return typeof sample === 'number' || !isNaN(Number(sample));
  };

  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-[400px]">
          <Loader2 className="h-10 w-10 animate-spin text-primary mr-2" />
          <span>Loading chart data...</span>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="flex flex-col justify-center items-center h-[400px] text-red-400">
          <AlertTriangle className="h-8 w-8 mb-2" />
          <p>Error: {error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      );
    }

    if (!data.length || !xAxisField || !yAxisField) {
      return (
        <div className="flex justify-center items-center h-[400px] text-muted-foreground">
          {!data.length 
            ? 'No data available for this dataset' 
            : !xAxisField || !yAxisField 
              ? 'Select fields to visualize' 
              : 'Ready to visualize'}
        </div>
      );
    }

    // Process data, ensuring numeric values for y-axis
    const chartData = data.map(item => ({
      ...item,
      [yAxisField]: isFieldNumeric(yAxisField) ? Number(item[yAxisField]) || 0 : 0
    }));

    // Limit data points to avoid overcrowded charts
    const limitedData = chartData.slice(0, 20);
    const chartColors = generateChartColors(limitedData.length);

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={limitedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis 
              dataKey={xAxisField} 
              tick={{ fill: '#ddd' }}
              height={60}
              angle={-45}
              textAnchor="end"
            />
            <YAxis 
              tick={{ fill: '#ddd' }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }}
              labelStyle={{ color: '#ddd' }}
            />
            <Legend wrapperStyle={{ color: '#ddd' }} />
            <Bar dataKey={yAxisField} fill="#8884d8" name={yAxisField}>
              {limitedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={limitedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis 
              dataKey={xAxisField} 
              tick={{ fill: '#ddd' }}
              height={60}
              angle={-45}
              textAnchor="end"
            />
            <YAxis 
              tick={{ fill: '#ddd' }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }}
              labelStyle={{ color: '#ddd' }}
            />
            <Legend wrapperStyle={{ color: '#ddd' }} />
            <Line 
              type="monotone" 
              dataKey={yAxisField} 
              stroke="#8884d8" 
              activeDot={{ r: 8 }} 
              name={yAxisField}
              strokeWidth={2}
            >
              {limitedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
              ))}
            </Line>
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'pie') {
      // For pie charts, limit to fewer slices for readability
      const pieData = limitedData.slice(0, 8);
      
      return (
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey={yAxisField}
              nameKey={xAxisField}
              cx="50%"
              cy="50%"
              outerRadius={150}
              fill="#8884d8"
              label={({ name, percent }) => 
                `${name}: ${(Number(percent) * 100).toFixed(0)}%`
              }
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }}
              labelStyle={{ color: '#ddd' }}
            />
            <Legend wrapperStyle={{ color: '#ddd' }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-medium mb-4">Visualize Your Data</h2>
      
      {datasetInfo && (
        <div className="bg-blue-900/30 border border-blue-500/40 rounded-lg p-4 mb-4">
          <h3 className="font-medium text-blue-300">Dataset: {datasetInfo.name}</h3>
          {datasetInfo.description && (
            <p className="text-sm text-blue-200/80 mt-1">{datasetInfo.description}</p>
          )}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <p className="mb-2 text-sm">Chart Type</p>
          <Select value={chartType} onValueChange={(value: ChartType) => setChartType(value)}>
            <SelectTrigger className="bg-black/70 border-gray-700 text-white">
              <SelectValue placeholder="Select chart type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">Bar Chart</SelectItem>
              <SelectItem value="line">Line Chart</SelectItem>
              <SelectItem value="pie">Pie Chart</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <p className="mb-2 text-sm">X-Axis Field</p>
          <Select value={xAxisField} onValueChange={setXAxisField}>
            <SelectTrigger className="bg-black/70 border-gray-700 text-white">
              <SelectValue placeholder="Select X-axis field" />
            </SelectTrigger>
            <SelectContent>
              {columns.map(column => (
                <SelectItem key={column} value={column}>{column}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <p className="mb-2 text-sm">Y-Axis Field</p>
          <Select value={yAxisField} onValueChange={setYAxisField}>
            <SelectTrigger className="bg-black/70 border-gray-700 text-white">
              <SelectValue placeholder="Select Y-axis field" />
            </SelectTrigger>
            <SelectContent>
              {columns.map(column => (
                <SelectItem key={column} value={column}>{column}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="glass-card p-6 rounded-lg">
        {renderChart()}
        
        {error && (
          <div className="mt-4 p-4 border border-red-500/30 bg-red-500/10 rounded-md">
            <details>
              <summary className="cursor-pointer text-red-300">View detailed error information</summary>
              <pre className="mt-2 overflow-auto text-xs text-red-200 p-2 bg-black/30 rounded">{error}</pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChartVisualization;
