
import React from 'react';
import { 
  Bar, 
  Line, 
  Pie, 
  Scatter,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell 
} from 'recharts';
import { BarChart, LineChart, PieChart, ScatterChart } from 'recharts';
import { QueryResult } from '@/services/types/queryTypes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon } from 'lucide-react';

interface EnhancedVisualizationProps {
  result: QueryResult;
}

const EnhancedVisualization: React.FC<EnhancedVisualizationProps> = ({ result }) => {
  if (!result) {
    return <div>No visualization data available</div>;
  }

  // Use either chartType or chart_type property
  const chartType = result.chartType || result.chart_type || 'bar';
  const { data, explanation } = result;
  const chartConfig = result.chartConfig || {};
  
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{chartConfig?.title || result.chart_title || 'No Data'}</CardTitle>
          <CardDescription>No data available for visualization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8 text-muted-foreground">
            {explanation || 'The query did not return any data to visualize.'}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Get all properties from the first item
  const firstItem = data[0];
  // Figure out which property to use for x-axis (name or category) if not specified
  const xAxisField = chartConfig?.xAxis || result.x_axis || Object.keys(firstItem)[0];
  
  // Figure out which property to use for y-axis (value or amount) if not specified
  // Prefer numeric fields
  const yAxisField = chartConfig?.yAxis || result.y_axis || Object.keys(firstItem).find(key => 
    typeof firstItem[key] === 'number' && key !== xAxisField
  ) || Object.keys(firstItem)[1];

  // Generate colors
  const chartColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00C49F', '#FFBB28', '#FF8042'];

  // Common tooltip props
  const tooltipProps = {
    contentStyle: { backgroundColor: '#222', border: '1px solid #444' },
    labelStyle: { color: '#ddd' }
  };

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis 
                dataKey={xAxisField} 
                tick={{ fill: '#ddd' }} 
                label={{ value: chartConfig?.xAxisTitle || '', fill: '#ddd', dy: 20 }}
              />
              <YAxis 
                tick={{ fill: '#ddd' }} 
                label={{ value: chartConfig?.yAxisTitle || '', fill: '#ddd', angle: -90, dx: -20 }}
              />
              <Tooltip {...tooltipProps} />
              <Legend wrapperStyle={{ color: '#ddd' }} />
              <Bar dataKey={yAxisField} fill="#8884d8">
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis 
                dataKey={xAxisField} 
                tick={{ fill: '#ddd' }} 
                label={{ value: chartConfig?.xAxisTitle || '', fill: '#ddd', dy: 20 }}
              />
              <YAxis 
                tick={{ fill: '#ddd' }} 
                label={{ value: chartConfig?.yAxisTitle || '', fill: '#ddd', angle: -90, dx: -20 }}
              />
              <Tooltip {...tooltipProps} />
              <Legend wrapperStyle={{ color: '#ddd' }} />
              <Line type="monotone" dataKey={yAxisField} stroke="#8884d8" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={data}
                dataKey={yAxisField}
                nameKey={xAxisField}
                cx="50%"
                cy="50%"
                outerRadius={150}
                fill="#8884d8"
                label={({ name, value, percent }) => 
                  `${name}: ${value} (${(Number(percent) * 100).toFixed(0)}%)`
                }
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip {...tooltipProps} />
              <Legend wrapperStyle={{ color: '#ddd' }} />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis 
                dataKey={xAxisField} 
                name={chartConfig?.xAxisTitle || xAxisField}
                tick={{ fill: '#ddd' }} 
                label={{ value: chartConfig?.xAxisTitle || '', fill: '#ddd', dy: 20 }}
              />
              <YAxis 
                dataKey={yAxisField} 
                name={chartConfig?.yAxisTitle || yAxisField}
                tick={{ fill: '#ddd' }} 
                label={{ value: chartConfig?.yAxisTitle || '', fill: '#ddd', angle: -90, dx: -20 }}
              />
              <Tooltip {...tooltipProps} cursor={{ strokeDasharray: '3 3' }} />
              <Legend wrapperStyle={{ color: '#ddd' }} />
              <Scatter name="Data Points" data={data} fill="#8884d8">
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'table':
        return (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-800">
                  {Object.keys(firstItem).map(key => (
                    <th key={key} className="p-2 text-left text-gray-300 border-b border-gray-700">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((item, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-900' : 'bg-gray-950'}>
                    {Object.entries(item).map(([key, value]) => (
                      <td key={key} className="p-2 border-b border-gray-800">{String(value)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        
      default:
        return (
          <div className="text-center p-8 text-gray-400">
            Unknown chart type: {chartType}
          </div>
        );
    }
  };

  const getChartIcon = () => {
    switch (chartType) {
      case 'bar':
        return <BarChart3 className="h-5 w-5 text-blue-400" />;
      case 'line':
        return <LineChartIcon className="h-5 w-5 text-green-400" />;
      case 'pie':
        return <PieChartIcon className="h-5 w-5 text-purple-400" />;
      default:
        return <BarChart3 className="h-5 w-5 text-blue-400" />;
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center space-y-0 gap-2">
        {getChartIcon()}
        <div>
          <CardTitle>{chartConfig?.title || result.chart_title || 'Data Visualization'}</CardTitle>
          {chartConfig?.subtitle && <CardDescription>{chartConfig.subtitle}</CardDescription>}
        </div>
      </CardHeader>
      <CardContent>
        {renderChart()}
        {explanation && (
          <div className="mt-4 p-4 bg-blue-950/30 border border-blue-500/20 rounded-md text-sm text-blue-200">
            <h4 className="font-medium mb-1">Analysis:</h4>
            <p>{explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedVisualization;
