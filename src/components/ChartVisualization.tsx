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
import { Loader2, AlertTriangle } from 'lucide-react';

interface ChartVisualizationProps {
  datasetId: string;
}

type ChartType = 'bar' | 'line' | 'pie';

// Rich color palette for beautiful visualizations
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
        
        // First get the dataset metadata to understand its schema
        const dataset = await dataService.getDataset(datasetId);
        
        if (!dataset) {
          setError("Dataset not found");
          setLoading(false);
          return;
        }
        
        console.log('Dataset metadata loaded:', dataset);
        setDatasetInfo(dataset);
        
        // Then get the preview data
        try {
          const previewData = await dataService.previewDataset(datasetId);
          
          if (!previewData || previewData.length === 0) {
            throw new Error("No data available in dataset");
          }
          
          console.log("Dataset preview data loaded:", previewData.length, "rows", previewData[0]);
          setData(previewData);
          
          const cols = Object.keys(previewData[0]);
          setColumns(cols);
          
          // Auto-select first string/date column for X axis and first number column for Y axis
          // Find suitable X axis (categorical data)
          let foundStringColumn = false;
          const stringColumn = cols.find(col => {
            const isString = typeof previewData[0][col] === 'string';
            const isDate = String(previewData[0][col]).match(/^\d{4}-\d{2}-\d{2}/);
            return isString || isDate;
          });
          
          if (stringColumn) {
            setXAxisField(stringColumn);
            foundStringColumn = true;
          } else {
            setXAxisField(cols[0]);
          }
          
          // Find suitable Y axis (numerical data)
          let foundNumberColumn = false;
          const numberColumn = cols.find(col => {
            const isNumber = typeof previewData[0][col] === 'number' || !isNaN(Number(previewData[0][col]));
            return isNumber && (!foundStringColumn || col !== stringColumn);
          });
          
          if (numberColumn) {
            setYAxisField(numberColumn);
            foundNumberColumn = true;
          } else {
            setYAxisField(cols[foundStringColumn ? 1 : 0] || cols[0]);
          }
        } catch (previewError) {
          console.error('Error loading dataset preview:', previewError);
          setError(`Failed to load dataset preview: ${previewError instanceof Error ? previewError.message : 'Unknown error'}`);
          
          // Retry with direct storage access if preview API fails
          try {
            console.log("Attempting direct storage access for dataset:", dataset.storage_path);
            const directData = await dataService.getDatasetDirectFromStorage(datasetId);
            
            if (directData && directData.length > 0) {
              console.log("Direct storage access successful:", directData.length, "rows");
              setData(directData);
              
              const cols = Object.keys(directData[0]);
              setColumns(cols);
              setXAxisField(cols[0]);
              setYAxisField(cols[1] || cols[0]);
              setError(null); // Clear error since we recovered
            }
          } catch (directError) {
            console.error("Direct storage access also failed:", directError);
            // Keep original error
          }
        }
      } catch (error) {
        console.error('Error loading dataset:', error);
        setError(`Failed to load dataset: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [datasetId, toast]);

  const isNumericField = (field: string) => {
    if (!data.length) return false;
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
            Retry
          </Button>
        </div>
      );
    }

    if (!data.length || !xAxisField || !yAxisField) {
      return (
        <div className="flex justify-center items-center h-[400px]">
          {!data.length ? 'No data available for this dataset' : 'Select fields to visualize'}
        </div>
      );
    }

    const chartData = data.map(item => ({
      ...item,
      [yAxisField]: isNumericField(yAxisField) ? Number(item[yAxisField]) : 0
    }));

    const limitedData = chartData.slice(0, 20);

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
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Line>
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'pie') {
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
              label={({ name, percent }) => `${name}: ${(Number(percent) * 100).toFixed(0)}%`}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
      </div>
    </div>
  );
};

export default ChartVisualization;
