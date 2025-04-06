
import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, LineChart, PieChart, ScatterChart,
  Bar, Line, Pie, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertTriangle, BarChart as BarChartIcon, RefreshCw } from 'lucide-react';
import { dataService } from '@/services/dataService';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';

interface ChartVisualizationProps {
  datasetId: string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const ChartVisualization: React.FC<ChartVisualizationProps> = ({ datasetId }) => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie' | 'scatter'>('bar');
  const [xAxisField, setXAxisField] = useState<string>('');
  const [yAxisField, setYAxisField] = useState<string>('');
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [categoricalFields, setCategoricalFields] = useState<string[]>([]);
  const [numericFields, setNumericFields] = useState<string[]>([]);

  const fetchDataset = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Fetching dataset preview for ${datasetId}`);
      const preview = await dataService.getDatasetPreview(datasetId);
      
      if (!preview || !preview.data || preview.data.length === 0) {
        throw new Error('No data available for visualization');
      }
      
      console.log(`Received dataset preview with ${preview.data.length} rows`);
      setData(preview.data);
      
      // Extract available fields and their types from the first data item
      const fields = Object.keys(preview.data[0]);
      setAvailableFields(fields);
      
      // Try to infer categorical and numeric fields
      const categorical: string[] = [];
      const numeric: string[] = [];
      
      // Use schema if available
      if (preview.schema) {
        console.log("Using schema from preview:", preview.schema);
        for (const [field, type] of Object.entries(preview.schema)) {
          if (type === 'string' || type === 'date') {
            categorical.push(field);
          } else if (type === 'number' || type === 'integer') {
            numeric.push(field);
          } else {
            // Check the actual data to determine field type
            const fieldType = typeof preview.data[0][field];
            if (fieldType === 'number') {
              numeric.push(field);
            } else {
              categorical.push(field);
            }
          }
        }
      } else {
        // Infer from data directly if no schema
        fields.forEach(field => {
          const value = preview.data[0][field];
          if (typeof value === 'number') {
            numeric.push(field);
          } else {
            categorical.push(field);
          }
        });
      }
      
      setCategoricalFields(categorical);
      setNumericFields(numeric);
      
      // Set default X and Y axes
      if (categorical.length > 0) {
        setXAxisField(categorical[0]);
      } else {
        setXAxisField(fields[0]);
      }
      
      if (numeric.length > 0) {
        setYAxisField(numeric[0]);
      } else if (fields.length > 1) {
        setYAxisField(fields[1]);
      } else if (fields.length === 1) {
        setYAxisField(fields[0]);
      }
      
      console.log("Categorical fields:", categorical);
      console.log("Numeric fields:", numeric);
      
    } catch (err) {
      console.error('Error fetching dataset preview:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dataset');
    } finally {
      setIsLoading(false);
    }
  }, [datasetId]);

  useEffect(() => {
    fetchDataset();
  }, [fetchDataset, datasetId]);

  const renderChart = () => {
    if (!xAxisField || !yAxisField) {
      return (
        <div className="flex flex-col items-center justify-center h-[300px] text-center">
          <AlertTriangle className="h-8 w-8 text-yellow-500 mb-2" />
          <p className="text-gray-400">Please select X and Y axis fields to visualize the data</p>
        </div>
      );
    }

    // Limit data points for better performance
    const limitedData = data.slice(0, 50);
    
    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={limitedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisField} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={yAxisField} fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={limitedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisField} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={yAxisField} stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={limitedData}
                nameKey={xAxisField}
                dataKey={yAxisField}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                label
              >
                {limitedData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisField} />
              <YAxis dataKey={yAxisField} />
              <Tooltip cursor={{ strokeDasharray: '3 3' }} />
              <Legend />
              <Scatter name="Data Points" data={limitedData} fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
          <p className="mt-4 text-gray-400">Loading visualization...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertTriangle className="h-12 w-12 text-yellow-500" />
          <h3 className="text-xl font-medium mt-4">Error Visualizing Data</h3>
          <p className="mt-2 text-gray-400">{error}</p>
          <Button onClick={fetchDataset} variant="outline" className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="flex items-center">
            <BarChartIcon className="mr-2 h-5 w-5 text-purple-500" />
            <h3 className="text-lg font-medium">Data Visualization</h3>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant={chartType === 'bar' ? 'default' : 'outline'}
              onClick={() => setChartType('bar')}
            >
              Bar
            </Button>
            <Button
              size="sm"
              variant={chartType === 'line' ? 'default' : 'outline'}
              onClick={() => setChartType('line')}
            >
              Line
            </Button>
            <Button
              size="sm"
              variant={chartType === 'pie' ? 'default' : 'outline'}
              onClick={() => setChartType('pie')}
            >
              Pie
            </Button>
            <Button
              size="sm"
              variant={chartType === 'scatter' ? 'default' : 'outline'}
              onClick={() => setChartType('scatter')}
            >
              Scatter
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <Label htmlFor="x-axis">X-Axis Field</Label>
            <Select value={xAxisField} onValueChange={setXAxisField}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select X-Axis Field" />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map((field) => (
                  <SelectItem key={field} value={field} className={categoricalFields.includes(field) ? 'text-blue-500' : ''}>
                    {field} {categoricalFields.includes(field) ? '(Category)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="y-axis">Y-Axis Field</Label>
            <Select value={yAxisField} onValueChange={setYAxisField}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Y-Axis Field" />
              </SelectTrigger>
              <SelectContent>
                {availableFields.map((field) => (
                  <SelectItem key={field} value={field} className={numericFields.includes(field) ? 'text-green-500' : ''}>
                    {field} {numericFields.includes(field) ? '(Numeric)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {renderChart()}
      </CardContent>
    </Card>
  );
};

export default ChartVisualization;
