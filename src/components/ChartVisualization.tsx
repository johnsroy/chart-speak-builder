
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
import { Loader2 } from 'lucide-react';

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
        
        // Then get the preview data
        const previewData = await dataService.previewDataset(datasetId);
        
        if (!previewData || previewData.length === 0) {
          console.error('No preview data available for dataset');
          setError("No data available in dataset");
          setLoading(false);
          return;
        }
        
        console.log("Dataset preview data loaded:", previewData.length, "rows", previewData[0]);
        setData(previewData);
        
        const cols = Object.keys(previewData[0]);
        setColumns(cols);
        
        // Get the column schema from dataset metadata or infer from the data
        const schema = dataset.column_schema || {};
        console.log("Column schema:", schema);
        
        // Auto-select first string/date column for X axis and first number column for Y axis
        // Find suitable X axis (categorical data)
        let foundStringColumn = false;
        const stringColumn = cols.find(col => {
          const isString = typeof previewData[0][col] === 'string';
          const isDate = schema[col] === 'date' || String(previewData[0][col]).match(/^\d{4}-\d{2}-\d{2}/);
          const isCategory = schema[col] === 'string' || schema[col] === 'text';
          return isString || isDate || isCategory;
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
          const isNumericType = schema[col] === 'number' || schema[col] === 'integer' || schema[col] === 'float';
          return (isNumber || isNumericType) && (!foundStringColumn || col !== stringColumn);
        });
        
        if (numberColumn) {
          setYAxisField(numberColumn);
          foundNumberColumn = true;
        } else {
          setYAxisField(cols[foundStringColumn ? 1 : 0] || cols[0]);
        }
        
        console.log("Selected X axis:", stringColumn || cols[0]);
        console.log("Selected Y axis:", numberColumn || (cols[1] || cols[0]));
      } catch (error) {
        console.error('Error loading dataset preview:', error);
        setError(error instanceof Error ? error.message : 'Failed to load dataset preview');
        toast({
          title: 'Error loading data',
          description: error instanceof Error ? error.message : 'Failed to load dataset preview',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [datasetId, toast]);

  // Helper function to determine if a field contains numerical data
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
        <div className="flex justify-center items-center h-[400px] text-red-400">
          <p>Error: {error}</p>
        </div>
      );
    }

    if (!data.length || !xAxisField || !yAxisField) {
      return (
        <div className="flex justify-center items-center h-[400px]">
          {!data.length ? 'No data available' : 'Select fields to visualize'}
        </div>
      );
    }

    // Process data for charts - ensure numeric values for y-axis
    const chartData = data.map(item => ({
      ...item,
      [yAxisField]: isNumericField(yAxisField) ? Number(item[yAxisField]) : 0
    }));

    // Limit data for better visualization
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
      // For pie charts, we need to limit the data even more
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
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <p className="mb-2 text-sm">Chart Type</p>
          <Select value={chartType} onValueChange={(value: ChartType) => setChartType(value)}>
            <SelectTrigger className="bg-black/50 border-gray-700">
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
            <SelectTrigger className="bg-black/50 border-gray-700">
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
            <SelectTrigger className="bg-black/50 border-gray-700">
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
