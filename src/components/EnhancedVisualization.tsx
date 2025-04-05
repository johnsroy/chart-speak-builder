
import React from 'react';
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { QueryResult } from '@/services/nlpService';
import { generateChartColors } from '@/utils/chartUtils';

interface EnhancedVisualizationProps {
  result: QueryResult;
}

const EnhancedVisualization: React.FC<EnhancedVisualizationProps> = ({ result }) => {
  if (!result || !result.data || result.data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-800 rounded-md">
        <p className="text-gray-400">No data to display</p>
      </div>
    );
  }

  const { chartType, chartConfig, data, explanation } = result;
  const COLORS = generateChartColors(data.length);

  // Extract axis information from the data
  const getAxes = () => {
    if (data.length === 0) return { xAxis: '', yAxis: '' };
    
    const firstRow = data[0];
    const keys = Object.keys(firstRow);
    
    // For grouped data, look for keys with aggregation prefixes
    const measureKey = keys.find(key => key.includes('_')) || keys[1] || keys[0];
    const dimensionKey = keys.find(key => !key.includes('_')) || keys[0];
    
    return {
      xAxis: chartConfig?.xAxisTitle || dimensionKey,
      yAxis: chartConfig?.yAxisTitle || measureKey
    };
  };

  const { xAxis, yAxis } = getAxes();

  const renderChart = () => {
    switch(chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis 
                dataKey={xAxis} 
                tick={{ fill: '#ddd' }}
                angle={-45}
                textAnchor="end"
                height={80}
                label={{ value: chartConfig?.xAxisTitle || xAxis, position: 'insideBottom', offset: -10, fill: '#ddd' }}
              />
              <YAxis 
                tick={{ fill: '#ddd' }}
                label={{ value: chartConfig?.yAxisTitle || yAxis, angle: -90, position: 'insideLeft', fill: '#ddd' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }}
                labelStyle={{ color: '#ddd' }}
              />
              <Legend wrapperStyle={{ color: '#ddd' }} />
              <Bar 
                dataKey={yAxis} 
                fill="#8884d8" 
                name={yAxis}
              />
            </BarChart>
          </ResponsiveContainer>
        );
        
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis 
                dataKey={xAxis} 
                tick={{ fill: '#ddd' }}
                angle={-45}
                textAnchor="end"
                height={80}
                label={{ value: chartConfig?.xAxisTitle || xAxis, position: 'insideBottom', offset: -10, fill: '#ddd' }}
              />
              <YAxis 
                tick={{ fill: '#ddd' }}
                label={{ value: chartConfig?.yAxisTitle || yAxis, angle: -90, position: 'insideLeft', fill: '#ddd' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }}
                labelStyle={{ color: '#ddd' }}
              />
              <Legend wrapperStyle={{ color: '#ddd' }} />
              <Line 
                type="monotone" 
                dataKey={yAxis} 
                stroke="#8884d8" 
                activeDot={{ r: 8 }} 
                name={yAxis}
              />
            </LineChart>
          </ResponsiveContainer>
        );
        
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <Pie
                data={data}
                dataKey={yAxis}
                nameKey={xAxis}
                cx="50%"
                cy="50%"
                outerRadius={150}
                fill="#8884d8"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
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
        
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" />
              <XAxis 
                dataKey={xAxis} 
                name={chartConfig?.xAxisTitle || xAxis}
                tick={{ fill: '#ddd' }}
                label={{ value: chartConfig?.xAxisTitle || xAxis, position: 'insideBottom', fill: '#ddd' }}
              />
              <YAxis 
                dataKey={yAxis}
                name={chartConfig?.yAxisTitle || yAxis}
                tick={{ fill: '#ddd' }}
                label={{ value: chartConfig?.yAxisTitle || yAxis, angle: -90, position: 'insideLeft', fill: '#ddd' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }}
                labelStyle={{ color: '#ddd' }}
                cursor={{ strokeDasharray: '3 3' }}
              />
              <Legend wrapperStyle={{ color: '#ddd' }} />
              <Scatter name="Data Points" data={data} fill="#8884d8" />
            </ScatterChart>
          </ResponsiveContainer>
        );
        
      case 'table':
      default:
        if (!data || data.length === 0) return null;
        
        const columns = Object.keys(data[0]);
        
        return (
          <div className="overflow-x-auto">
            <Table>
              <TableCaption>Data Table View</TableCaption>
              <TableHeader>
                <TableRow>
                  {columns.map((column, index) => (
                    <TableHead key={index}>{column}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 100).map((row, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {columns.map((column, colIndex) => (
                      <TableCell key={`${rowIndex}-${colIndex}`}>{row[column]}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        );
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle>{chartConfig?.title || 'Data Visualization'}</CardTitle>
        {explanation && (
          <CardDescription>{explanation}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
};

export default EnhancedVisualization;
