
import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { QueryConfig, queryService, QueryResult } from '@/services/queryService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface ChartBuilderProps {
  datasetId: string;
}

const ChartBuilder: React.FC<ChartBuilderProps> = ({ datasetId }) => {
  const [activeTab, setActiveTab] = useState('builder');
  const [queryConfig, setQueryConfig] = useState<QueryConfig>({
    dataset_id: datasetId,
    chart_type: 'bar',
    measures: [{ field: '', aggregation: 'sum' }],
    dimensions: [{ field: '' }]
  });
  const [availableColumns, setAvailableColumns] = useState<Array<{name: string, type: string}>>([]);
  const [naturalLanguageQuery, setNaturalLanguageQuery] = useState('');
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [queryName, setQueryName] = useState('');
  
  const { toast } = useToast();

  // Load dataset columns
  useEffect(() => {
    const loadDatasetColumns = async () => {
      try {
        const { data } = await queryService.executeQuery({
          name: 'Column Preview',
          dataset_id: datasetId,
          query_type: 'ui_builder',
          query_text: '',
          query_config: {
            dataset_id: datasetId,
            chart_type: 'table',
            measures: [],
            dimensions: [],
            limit: 1
          }
        });
        
        if (data && data.length > 0) {
          // Extract column names from the first row
          const columns = Object.keys(data[0]).map(key => ({
            name: key,
            type: typeof data[0][key]
          }));
          setAvailableColumns(columns);
        }
      } catch (error) {
        console.error('Error loading dataset columns:', error);
      }
    };
    
    if (datasetId) {
      loadDatasetColumns();
    }
  }, [datasetId]);

  const executeQuery = async () => {
    setIsLoading(true);
    try {
      let result;
      
      if (activeTab === 'builder') {
        result = await queryService.executeQuery({
          name: queryName || 'UI Builder Query',
          dataset_id: datasetId,
          query_type: 'ui_builder',
          query_text: '',
          query_config: queryConfig
        });
      } else if (activeTab === 'natural') {
        result = await queryService.executeQuery({
          name: queryName || 'Natural Language Query',
          dataset_id: datasetId,
          query_type: 'natural_language',
          query_text: naturalLanguageQuery,
          query_config: {
            dataset_id: datasetId,
            chart_type: 'bar',
            measures: [],
            dimensions: []
          }
        });
      } else if (activeTab === 'sql') {
        result = await queryService.executeQuery({
          name: queryName || 'SQL Query',
          dataset_id: datasetId,
          query_type: 'sql',
          query_text: sqlQuery,
          query_config: {
            dataset_id: datasetId,
            chart_type: 'table',
            measures: [],
            dimensions: []
          }
        });
      }
      
      if (result) {
        setQueryResult(result);
        if (result.error) {
          toast({
            title: 'Query error',
            description: result.error,
            variant: 'destructive',
          });
        }
      }
    } catch (error) {
      toast({
        title: 'Error executing query',
        description: error instanceof Error ? error.message : 'Failed to execute query',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveQuery = async () => {
    if (!queryName) {
      toast({
        title: 'Please enter a name for your query',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      let query;
      
      if (activeTab === 'builder') {
        query = {
          name: queryName,
          dataset_id: datasetId,
          query_type: 'ui_builder',
          query_text: '',
          query_config: queryConfig
        };
      } else if (activeTab === 'natural') {
        query = {
          name: queryName,
          dataset_id: datasetId,
          query_type: 'natural_language',
          query_text: naturalLanguageQuery,
          query_config: {
            dataset_id: datasetId,
            chart_type: 'bar',
            measures: [],
            dimensions: []
          }
        };
      } else if (activeTab === 'sql') {
        query = {
          name: queryName,
          dataset_id: datasetId,
          query_type: 'sql',
          query_text: sqlQuery,
          query_config: {
            dataset_id: datasetId,
            chart_type: 'table',
            measures: [],
            dimensions: []
          }
        };
      } else {
        return;
      }
      
      await queryService.saveQuery(query);
      
      toast({
        title: 'Query saved',
        description: `Query "${queryName}" has been saved successfully.`,
      });
    } catch (error) {
      toast({
        title: 'Error saving query',
        description: error instanceof Error ? error.message : 'Failed to save query',
        variant: 'destructive',
      });
    }
  };

  const renderChart = () => {
    if (!queryResult || !queryResult.data || queryResult.data.length === 0) {
      return <div className="flex items-center justify-center h-64 bg-gray-100 rounded-md">
        <p className="text-gray-500">No data to display</p>
      </div>;
    }
    
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00C49F'];
    const data = queryResult.data;
    
    switch (queryConfig.chart_type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={queryConfig.dimensions[0]?.field || queryResult.columns[0]} 
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              {queryConfig.measures.map((measure, index) => (
                <Bar 
                  key={index}
                  dataKey={`${measure.aggregation}_${measure.field}`}
                  name={`${measure.aggregation} of ${measure.field}`}
                  fill={colors[index % colors.length]} 
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
        
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey={queryConfig.dimensions[0]?.field || queryResult.columns[0]} 
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              {queryConfig.measures.map((measure, index) => (
                <Line 
                  key={index}
                  type="monotone"
                  dataKey={`${measure.aggregation}_${measure.field}`}
                  name={`${measure.aggregation} of ${measure.field}`}
                  stroke={colors[index % colors.length]}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
        
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie
                data={data}
                nameKey={queryConfig.dimensions[0]?.field || queryResult.columns[0]}
                dataKey={queryConfig.measures[0] ? 
                  `${queryConfig.measures[0].aggregation}_${queryConfig.measures[0].field}` : 
                  queryResult.columns[1]
                }
                cx="50%"
                cy="50%"
                outerRadius={150}
                fill="#8884d8"
                label
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        );
        
      case 'scatter':
        if (queryConfig.measures.length >= 2) {
          const xDataKey = `${queryConfig.measures[0].aggregation}_${queryConfig.measures[0].field}`;
          const yDataKey = `${queryConfig.measures[1].aggregation}_${queryConfig.measures[1].field}`;
          
          return (
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey={xDataKey}
                  name={queryConfig.measures[0].field}
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  dataKey={yDataKey}
                  name={queryConfig.measures[1].field}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Legend />
                <Scatter 
                  name={`${queryConfig.measures[0].field} vs ${queryConfig.measures[1].field}`} 
                  data={data} 
                  fill="#8884d8" 
                />
              </ScatterChart>
            </ResponsiveContainer>
          );
        }
        
      default:
        return (
          <div className="overflow-auto max-h-96 rounded-md border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {queryResult.columns.map((column, index) => (
                    <th 
                      key={index} 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {queryResult.data.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {queryResult.columns.map((column, colIndex) => (
                      <td 
                        key={`${rowIndex}-${colIndex}`} 
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                      >
                        {row[column]?.toString() || ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
    }
  };

  const addMeasure = () => {
    setQueryConfig({
      ...queryConfig,
      measures: [
        ...queryConfig.measures,
        { field: '', aggregation: 'sum' }
      ]
    });
  };

  const updateMeasure = (index: number, field: string, value: string) => {
    const updatedMeasures = [...queryConfig.measures];
    if (field === 'field') {
      updatedMeasures[index].field = value;
    } else if (field === 'aggregation') {
      updatedMeasures[index].aggregation = value as 'sum' | 'avg' | 'min' | 'max' | 'count';
    }
    
    setQueryConfig({
      ...queryConfig,
      measures: updatedMeasures
    });
  };

  const removeMeasure = (index: number) => {
    if (queryConfig.measures.length > 1) {
      const updatedMeasures = [...queryConfig.measures];
      updatedMeasures.splice(index, 1);
      setQueryConfig({
        ...queryConfig,
        measures: updatedMeasures
      });
    }
  };

  const addDimension = () => {
    setQueryConfig({
      ...queryConfig,
      dimensions: [
        ...queryConfig.dimensions,
        { field: '' }
      ]
    });
  };

  const updateDimension = (index: number, value: string) => {
    const updatedDimensions = [...queryConfig.dimensions];
    updatedDimensions[index].field = value;
    
    setQueryConfig({
      ...queryConfig,
      dimensions: updatedDimensions
    });
  };

  const removeDimension = (index: number) => {
    if (queryConfig.dimensions.length > 1) {
      const updatedDimensions = [...queryConfig.dimensions];
      updatedDimensions.splice(index, 1);
      setQueryConfig({
        ...queryConfig,
        dimensions: updatedDimensions
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Chart Builder</h2>
          <p className="text-gray-500">Visualize and analyze your dataset</p>
        </div>
        <div className="flex items-center space-x-3">
          <Input
            placeholder="Query Name"
            value={queryName}
            onChange={(e) => setQueryName(e.target.value)}
            className="w-48"
          />
          <Button onClick={saveQuery} disabled={isLoading}>Save Query</Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="builder">Visual Builder</TabsTrigger>
          <TabsTrigger value="natural">Natural Language</TabsTrigger>
          <TabsTrigger value="sql">SQL Query</TabsTrigger>
        </TabsList>
        <TabsContent value="builder" className="space-y-4 pt-4">
          <div className="flex space-x-4">
            <div className="w-1/3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Chart Type</label>
              <Select 
                value={queryConfig.chart_type} 
                onValueChange={(value) => setQueryConfig({...queryConfig, chart_type: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select chart type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="line">Line Chart</SelectItem>
                  <SelectItem value="pie">Pie Chart</SelectItem>
                  <SelectItem value="scatter">Scatter Plot</SelectItem>
                  <SelectItem value="table">Table</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Measures (Values)</label>
                <Button size="sm" variant="outline" onClick={addMeasure}>+ Add Measure</Button>
              </div>
              
              {queryConfig.measures.map((measure, index) => (
                <div key={index} className="flex space-x-2 mb-2">
                  <Select 
                    value={measure.aggregation} 
                    onValueChange={(value) => updateMeasure(index, 'aggregation', value)}
                  >
                    <SelectTrigger className="w-1/3">
                      <SelectValue placeholder="Aggregation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sum">Sum</SelectItem>
                      <SelectItem value="avg">Average</SelectItem>
                      <SelectItem value="min">Minimum</SelectItem>
                      <SelectItem value="max">Maximum</SelectItem>
                      <SelectItem value="count">Count</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select 
                    value={measure.field} 
                    onValueChange={(value) => updateMeasure(index, 'field', value)}
                  >
                    <SelectTrigger className="w-2/3">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColumns.map((column) => (
                        <SelectItem key={column.name} value={column.name}>
                          {column.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeMeasure(index)}
                    disabled={queryConfig.measures.length <= 1}
                  >
                    &times;
                  </Button>
                </div>
              ))}
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Dimensions (Categories)</label>
                <Button size="sm" variant="outline" onClick={addDimension}>+ Add Dimension</Button>
              </div>
              
              {queryConfig.dimensions.map((dimension, index) => (
                <div key={index} className="flex space-x-2 mb-2">
                  <Select 
                    value={dimension.field} 
                    onValueChange={(value) => updateDimension(index, value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select field" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableColumns.map((column) => (
                        <SelectItem key={column.name} value={column.name}>
                          {column.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => removeDimension(index)}
                    disabled={queryConfig.dimensions.length <= 1}
                  >
                    &times;
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="natural" className="space-y-4 pt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ask a question about your data
            </label>
            <div className="flex space-x-2">
              <Input
                placeholder="e.g., Show me total sales by region as a bar chart"
                value={naturalLanguageQuery}
                onChange={(e) => setNaturalLanguageQuery(e.target.value)}
                className="flex-grow"
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="sql" className="space-y-4 pt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SQL Query
            </label>
            <textarea
              placeholder="Enter your SQL query"
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              className="w-full h-32 p-2 border rounded-md"
              rows={4}
            />
          </div>
        </TabsContent>
      </Tabs>
      
      <Button onClick={executeQuery} disabled={isLoading} className="w-full">
        {isLoading ? 'Processing...' : 'Execute Query'}
      </Button>
      
      <div className="mt-6">
        <h3 className="text-xl font-semibold mb-2">Results</h3>
        <div className="border rounded-md p-4 bg-white">
          {queryResult ? renderChart() : (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500">Execute a query to see results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChartBuilder;
