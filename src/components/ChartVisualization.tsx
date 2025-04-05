
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

interface ChartVisualizationProps {
  datasetId: string;
}

type ChartType = 'bar' | 'line' | 'pie';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

const ChartVisualization: React.FC<ChartVisualizationProps> = ({ datasetId }) => {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xAxisField, setXAxisField] = useState<string>('');
  const [yAxisField, setYAxisField] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const previewData = await dataService.previewDataset(datasetId);
        if (previewData && previewData.length > 0) {
          setData(previewData);
          const cols = Object.keys(previewData[0]);
          setColumns(cols);
          
          // Auto-select first string/date column for X axis and first number column for Y axis
          const dataset = await dataService.getDataset(datasetId);
          const schema = dataset.column_schema;
          
          // Find suitable X axis (categorical data)
          const stringColumn = cols.find(col => schema[col] === 'string' || schema[col] === 'date');
          if (stringColumn) {
            setXAxisField(stringColumn);
          } else {
            setXAxisField(cols[0]);
          }
          
          // Find suitable Y axis (numerical data)
          const numberColumn = cols.find(col => schema[col] === 'number' || schema[col] === 'integer');
          if (numberColumn) {
            setYAxisField(numberColumn);
          } else {
            setYAxisField(cols[1] || cols[0]);
          }
        }
      } catch (error) {
        console.error('Error loading dataset preview:', error);
        toast({
          title: 'Error loading data',
          description: error instanceof Error ? error.message : 'Failed to load dataset preview',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    
    if (datasetId) {
      loadData();
    }
  }, [datasetId, toast]);

  // Helper function to determine if a field contains numerical data
  const isNumericField = (field: string) => {
    if (!data.length) return false;
    const sample = data[0][field];
    return typeof sample === 'number' || !isNaN(Number(sample));
  };

  const renderChart = () => {
    if (loading || !data.length || !xAxisField || !yAxisField) {
      return (
        <div className="flex justify-center items-center h-[400px]">
          {loading ? 'Loading chart data...' : 'Select fields to visualize'}
        </div>
      );
    }

    // Process data for charts - ensure numeric values for y-axis
    const chartData = data.map(item => ({
      ...item,
      [yAxisField]: isNumericField(yAxisField) ? Number(item[yAxisField]) : 0
    }));

    const chartConfig = {
      data: chartData.slice(0, 20), // Limit to 20 items for better visualization
      xAxis: xAxisField,
      yAxis: yAxisField
    };

    if (chartType === 'bar') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartConfig.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis 
              dataKey={chartConfig.xAxis} 
              tick={{ fill: '#ddd' }}
            />
            <YAxis 
              tick={{ fill: '#ddd' }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }}
              labelStyle={{ color: '#ddd' }}
            />
            <Legend wrapperStyle={{ color: '#ddd' }} />
            <Bar dataKey={chartConfig.yAxis} fill="#8884d8" name={chartConfig.yAxis} />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartConfig.data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#444" />
            <XAxis 
              dataKey={chartConfig.xAxis} 
              tick={{ fill: '#ddd' }}
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
              dataKey={chartConfig.yAxis} 
              stroke="#8884d8" 
              activeDot={{ r: 8 }} 
              name={chartConfig.yAxis}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'pie') {
      // For pie charts, we need to limit the data even more
      const pieData = chartConfig.data.slice(0, 8);
      
      return (
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey={chartConfig.yAxis}
              nameKey={chartConfig.xAxis}
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
            <SelectTrigger>
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
            <SelectTrigger>
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
            <SelectTrigger>
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
      
      <div className="glass-card p-4">
        {renderChart()}
      </div>
    </div>
  );
};

export default ChartVisualization;
