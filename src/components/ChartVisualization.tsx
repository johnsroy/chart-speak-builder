
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
import Papa from 'papaparse';

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
          console.log("Trying to download file directly from storage...");
          const { data, error } = await supabase.storage
            .from(dataset.storage_type || 'datasets')
            .download(dataset.storage_path);
            
          if (error) throw error;
          
          // Process CSV data
          const text = await data.text();
          const parsedData = Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true // Auto-convert numeric values
          });
          
          if (parsedData.data && Array.isArray(parsedData.data) && parsedData.data.length > 0) {
            previewData = parsedData.data.slice(0, 100); // Limit to 100 rows for performance
            console.log("Parsed CSV data:", previewData.length, "rows");
            
            // Update schema if not already present
            if (!dataset.column_schema || Object.keys(dataset.column_schema).length === 0) {
              const inferredSchema = inferSchemaFromData(previewData[0]);
              console.log("Inferred schema:", inferredSchema);
              dataset.column_schema = inferredSchema;
            }
          }
        } catch (storageError) {
          console.warn('Direct storage access error:', storageError);
          errorMessage = `Storage: ${storageError instanceof Error ? storageError.message : String(storageError)}`;
          
          try {
            console.log("Trying fallback storage...");
            const { data, error } = await supabase.storage
              .from('fallback')
              .download(dataset.storage_path);
              
            if (error) throw error;
            
            // Process CSV data
            const text = await data.text();
            const parsedData = Papa.parse(text, {
              header: true,
              skipEmptyLines: true,
              dynamicTyping: true
            });
            
            if (parsedData.data && Array.isArray(parsedData.data) && parsedData.data.length > 0) {
              previewData = parsedData.data.slice(0, 100);
              console.log("Parsed CSV data from fallback:", previewData.length, "rows");
              
              if (!dataset.column_schema || Object.keys(dataset.column_schema).length === 0) {
                const inferredSchema = inferSchemaFromData(previewData[0]);
                console.log("Inferred schema from fallback:", inferredSchema);
                dataset.column_schema = inferredSchema;
              }
            }
          } catch (fallbackError) {
            console.warn('Fallback storage error:', fallbackError);
            errorMessage += `\nFallback: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`;
            
            try {
              console.log("Trying data-processor edge function...");
              const { data, error } = await supabase.functions.invoke('data-processor', {
                body: { action: 'preview', dataset_id: datasetId }
              });
              
              if (error) throw error;
              
              if (data && data.data && Array.isArray(data.data) && data.data.length > 0) {
                previewData = data.data;
                console.log("Got data from data-processor:", previewData.length, "rows");
                
                if (data.schema && (!dataset.column_schema || Object.keys(dataset.column_schema).length === 0)) {
                  console.log("Using schema from data-processor:", data.schema);
                  dataset.column_schema = data.schema;
                }
              }
            } catch (processorError) {
              console.warn('Data processor error:', processorError);
              errorMessage += `\nProcessor: ${processorError instanceof Error ? processorError.message : String(processorError)}`;
              
              // Generate sample data as a last resort
              console.log("Using sample data as fallback");
              previewData = generateSampleDataFromSchema(dataset);
              console.log("Generated sample data:", previewData.length, "rows");
            }
          }
        }
        
        if (!previewData || previewData.length === 0) {
          throw new Error(`Could not load dataset data: ${errorMessage}`);
        }
        
        // Set data and update column selection
        setData(previewData);
        
        // Get columns from the actual data
        const cols = Object.keys(previewData[0] || {});
        setColumns(cols);
        
        // Auto select visualization fields
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

  const generateSampleDataFromSchema = (dataset: any) => {
    let sampleColumns = [];
    
    // First, use existing schema if available
    if (dataset.column_schema && Object.keys(dataset.column_schema).length > 0) {
      sampleColumns = Object.keys(dataset.column_schema);
    } 
    // For a CSV file, try to guess columns from the filename
    else if (dataset.file_name && dataset.file_name.toLowerCase().endsWith('.csv')) {
      // Try to get a hint about the dataset from its name
      const name = dataset.name || dataset.file_name;
      
      if (name.toLowerCase().includes('electric') || name.toLowerCase().includes('vehicle')) {
        sampleColumns = ['Make', 'Model', 'Year', 'Battery', 'Range', 'Price'];
      } else if (name.toLowerCase().includes('sale') || name.toLowerCase().includes('revenue')) {
        sampleColumns = ['Date', 'Product', 'Category', 'Quantity', 'Price', 'Revenue'];
      } else {
        sampleColumns = ['Category', 'Value', 'Count', 'Region', 'Year'];
      }
    } else {
      // Default columns
      sampleColumns = ['Category', 'Value', 'Count', 'Year'];
    }
    
    // Generate sample data
    const sampleData = [];
    const categories = ['Type A', 'Type B', 'Type C', 'Type D', 'Type E'];
    const years = [2020, 2021, 2022, 2023, 2024];
    
    for (let i = 0; i < 20; i++) {
      const row: any = {};
      
      sampleColumns.forEach(col => {
        if (col.toLowerCase().includes('year')) {
          row[col] = years[i % years.length];
        } else if (col.toLowerCase().includes('category') || 
                 col.toLowerCase().includes('type') || 
                 col.toLowerCase().includes('make') ||
                 col.toLowerCase().includes('model')) {
          row[col] = categories[i % categories.length];
        } else if (col.toLowerCase().includes('price') || 
                  col.toLowerCase().includes('revenue') || 
                  col.toLowerCase().includes('value')) {
          row[col] = Math.floor(Math.random() * 10000) / 100;
        } else if (col.toLowerCase().includes('count') || 
                  col.toLowerCase().includes('quantity') || 
                  col.toLowerCase().includes('number')) {
          row[col] = Math.floor(Math.random() * 100);
        } else {
          // Generic value
          row[col] = `Value ${i + 1}`;
        }
      });
      
      sampleData.push(row);
    }
    
    return sampleData;
  };

  const autoSelectVisualizationFields = (data: any[], columns: string[], dataset: any) => {
    // If no data or columns, return early
    if (!columns.length || !data.length) return;
    
    // First, check schema for guidance
    let xFieldCandidates: string[] = [];
    let yFieldCandidates: string[] = [];
    
    if (dataset.column_schema && Object.keys(dataset.column_schema).length > 0) {
      // Get categorical fields for x-axis
      xFieldCandidates = columns.filter(col => 
        dataset.column_schema[col] === 'string' || 
        dataset.column_schema[col] === 'date'
      );
      
      // Get numeric fields for y-axis
      yFieldCandidates = columns.filter(col => 
        dataset.column_schema[col] === 'number' || 
        dataset.column_schema[col] === 'integer'
      );
    }
    
    // If schema didn't help, infer from data
    if (xFieldCandidates.length === 0 || yFieldCandidates.length === 0) {
      // Check actual data types
      xFieldCandidates = columns.filter(col => {
        const firstVal = data[0][col];
        return typeof firstVal === 'string' || 
              (typeof firstVal === 'string' && !isNaN(Date.parse(firstVal)));
      });
      
      yFieldCandidates = columns.filter(col => {
        const firstVal = data[0][col];
        return typeof firstVal === 'number' || 
              (typeof firstVal === 'string' && !isNaN(Number(firstVal)));
      });
    }
    
    // Still no good candidates? Use positional fallbacks
    if (xFieldCandidates.length === 0 && columns.length > 0) {
      xFieldCandidates = [columns[0]];
    }
    
    if (yFieldCandidates.length === 0 && columns.length > 1) {
      yFieldCandidates = [columns[1]];
    } else if (yFieldCandidates.length === 0 && columns.length > 0 && columns[0] !== xFieldCandidates[0]) {
      yFieldCandidates = [columns[0]];
    }
    
    // Set fields
    if (xFieldCandidates.length > 0) {
      setXAxisField(xFieldCandidates[0]);
    }
    
    if (yFieldCandidates.length > 0) {
      // Prefer a different field than x-axis
      const yField = yFieldCandidates.find(field => field !== xFieldCandidates[0]) || yFieldCandidates[0];
      setYAxisField(yField);
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
