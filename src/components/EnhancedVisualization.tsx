
import React from 'react';
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie, 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
  Area, AreaChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, ReferenceLine
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
  
  // Use custom color scheme if provided, otherwise generate colors
  const COLORS = chartConfig?.colorScheme || generateChartColors(data.length);

  // Extract axis information from the data
  const getAxes = () => {
    if (data.length === 0) return { xAxis: '', yAxis: '' };
    
    const firstRow = data[0];
    const keys = Object.keys(firstRow);
    
    // For grouped data, look for keys with aggregation prefixes
    const measureKey = keys.find(key => 
      key.includes('_') || 
      typeof firstRow[key] === 'number'
    ) || keys[1] || keys[0];
    
    const dimensionKey = keys.find(key => 
      !key.includes('_') && 
      typeof firstRow[key] !== 'number'
    ) || keys[0];
    
    return {
      xAxis: chartConfig?.xAxisTitle || dimensionKey,
      yAxis: chartConfig?.yAxisTitle || measureKey
    };
  };

  const { xAxis, yAxis } = getAxes();

  // Generate a beautiful gradient for charts
  const getChartGradient = (id: string) => (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#9b87f5" stopOpacity={0.8}/>
      <stop offset="95%" stopColor="#9b87f5" stopOpacity={0.2}/>
    </linearGradient>
  );

  // Format label to handle various data types
  const formatLabel = (value: any) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') return value.toLocaleString();
    return String(value);
  };

  // Default formatter for values
  const defaultFormatter = (value: any) => {
    if (value === null || value === undefined) return 'N/A';
    if (typeof value === 'number') {
      // Handle different magnitudes
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
      if (value % 1 === 0) return value.toLocaleString();
      return value.toFixed(2);
    }
    return String(value);
  };
  
  // Format tick for axis
  const formatTick = (value: any) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string' && value.length > 15) {
      return `${value.substring(0, 12)}...`;
    }
    return String(value);
  };

  // Detect if xAxis contains dates
  const containsDates = data.some(item => {
    const value = item[xAxis];
    return typeof value === 'string' && 
      (value.match(/^\d{4}-\d{2}-\d{2}/) || 
       value.match(/^\d{2}\/\d{2}\/\d{4}/));
  });

  const renderChart = () => {
    switch(chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <defs>{getChartGradient("colorUv")}</defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" opacity={0.1} />
              <XAxis 
                dataKey={xAxis} 
                tick={{ fill: '#ddd' }}
                angle={-45}
                textAnchor="end"
                height={80}
                tickFormatter={formatTick}
                label={{ value: chartConfig?.xAxisTitle || xAxis, position: 'insideBottom', offset: -10, fill: '#ddd' }}
              />
              <YAxis 
                tick={{ fill: '#ddd' }}
                tickFormatter={defaultFormatter}
                label={{ value: chartConfig?.yAxisTitle || yAxis, angle: -90, position: 'insideLeft', fill: '#ddd' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }}
                labelStyle={{ color: '#ddd' }}
                formatter={(value, name) => [defaultFormatter(value), name]}
                labelFormatter={formatLabel}
                cursor={{ fill: 'rgba(255,255,255,0.1)' }}
              />
              <Legend wrapperStyle={{ color: '#ddd' }} />
              <Bar 
                dataKey={yAxis} 
                fill="url(#colorUv)" 
                name={yAxis}
                animationDuration={1500}
                radius={[4, 4, 0, 0]}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
        
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <defs>
                {getChartGradient("colorUv")}
                <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#9b87f5" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#9b87f5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" opacity={0.1} />
              <XAxis 
                dataKey={xAxis} 
                tick={{ fill: '#ddd' }}
                angle={containsDates ? -45 : 0}
                textAnchor={containsDates ? "end" : "middle"}
                height={containsDates ? 80 : 30}
                tickFormatter={formatTick}
                label={{ value: chartConfig?.xAxisTitle || xAxis, position: 'insideBottom', offset: -10, fill: '#ddd' }}
              />
              <YAxis 
                tick={{ fill: '#ddd' }}
                tickFormatter={defaultFormatter}
                label={{ value: chartConfig?.yAxisTitle || yAxis, angle: -90, position: 'insideLeft', fill: '#ddd' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }}
                labelStyle={{ color: '#ddd' }}
                formatter={(value, name) => [defaultFormatter(value), name]}
                labelFormatter={formatLabel}
              />
              <Legend wrapperStyle={{ color: '#ddd' }} />
              <Area
                type="monotone"
                dataKey={yAxis}
                stroke="#9b87f5"
                strokeWidth={0}
                fillOpacity={1}
                fill="url(#colorArea)"
                animationDuration={1500}
              />
              <Line 
                type="monotone" 
                dataKey={yAxis} 
                stroke="#9b87f5" 
                strokeWidth={3}
                dot={{ stroke: '#9b87f5', strokeWidth: 2, fill: '#1A1F2C', r: 6 }}
                activeDot={{ r: 8, stroke: '#D6BCFA', strokeWidth: 2, fill: '#9b87f5' }} 
                name={yAxis}
                animationDuration={1500}
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
                innerRadius={60} // Make it a donut chart for more modern look
                fill="#8884d8"
                paddingAngle={2} // Add spacing between sections
                label={({ name, percent }) => `${formatTick(name)}: ${(percent * 100).toFixed(0)}%`}
                labelLine={false} // Remove label lines for cleaner look
                animationDuration={1500}
                animationBegin={0}
                animationEasing="ease-out"
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                    stroke="rgba(0,0,0,0.2)" 
                    strokeWidth={1} 
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }}
                labelStyle={{ color: '#ddd' }}
                formatter={(value, name) => [defaultFormatter(value), name]}
                labelFormatter={formatLabel}
              />
              <Legend 
                wrapperStyle={{ color: '#ddd' }}
                layout="horizontal" 
                verticalAlign="bottom"
                align="center"
                formatter={(value) => <span className="text-sm">{formatTick(value)}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        );
        
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <defs>
                <linearGradient id="scatterGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="5%" stopColor="#9b87f5" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#6E59A5" stopOpacity={0.8}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#444" opacity={0.1} />
              <XAxis 
                dataKey={xAxis} 
                name={chartConfig?.xAxisTitle || xAxis}
                tick={{ fill: '#ddd' }}
                tickFormatter={defaultFormatter}
                label={{ value: chartConfig?.xAxisTitle || xAxis, position: 'insideBottom', fill: '#ddd' }}
              />
              <YAxis 
                dataKey={yAxis}
                name={chartConfig?.yAxisTitle || yAxis}
                tick={{ fill: '#ddd' }}
                tickFormatter={defaultFormatter}
                label={{ value: chartConfig?.yAxisTitle || yAxis, angle: -90, position: 'insideLeft', fill: '#ddd' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#222', border: '1px solid #444' }}
                labelStyle={{ color: '#ddd' }}
                formatter={(value, name) => [defaultFormatter(value), name]}
                cursor={{ strokeDasharray: '3 3' }}
              />
              <Legend wrapperStyle={{ color: '#ddd' }} />
              <Scatter 
                name="Data Points" 
                data={data} 
                fill="url(#scatterGrad)"
                shape="circle"
                animationDuration={1500}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Scatter>
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
                      <TableCell key={`${rowIndex}-${colIndex}`}>
                        {typeof row[column] === 'number' ? 
                          defaultFormatter(row[column]) : 
                          formatLabel(row[column])}
                      </TableCell>
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
    <Card className="glass-card backdrop-blur-md bg-gray-900/50 border border-purple-500/20">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-gradient bg-gradient-to-br from-white via-white/90 to-white/70 bg-clip-text">
          {chartConfig?.title || 'Data Visualization'}
        </CardTitle>
        {explanation && (
          <CardDescription className="text-gray-300">{explanation}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
    </Card>
  );
};

export default EnhancedVisualization;
