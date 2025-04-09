
import React from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  PieChart, 
  Pie, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  Cell
} from 'recharts';
import { COLOR_PALETTES } from '@/utils/chartUtils';

// Define props with strict typing
interface ChartWrapperProps {
  data: any[];
  chartType: string;
  xAxisKey?: string;
  yAxisKey?: string;
  width?: number | string;
  height?: number | string;
  className?: string;
}

const ChartWrapper: React.FC<ChartWrapperProps> = ({
  data,
  chartType,
  xAxisKey = 'name',
  yAxisKey = 'value',
  width = '100%',
  height = 300,
  className = '',
}) => {
  // Don't use ResponsiveContainer if exact dimensions are provided
  const useResponsive = width === '100%' || height === '100%' || 
    typeof width === 'string' || typeof height === 'string';
  
  // Set up common props for axes to avoid defaultProps warning
  const xAxisProps = {
    dataKey: xAxisKey,
    stroke: '#888',
    fontSize: 12,
    tickLine: false,
    axisLine: true,
  };
  
  const yAxisProps = {
    stroke: '#888',
    fontSize: 12,
    tickLine: false,
    axisLine: true,
    // Use default parameters instead of defaultProps
    width: 80,
  };

  const renderChart = () => {
    switch (chartType.toLowerCase()) {
      case 'bar':
        return (
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip />
            <Legend />
            <Bar dataKey={yAxisKey} fill={COLOR_PALETTES.professional[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        );
        
      case 'line':
        return (
          <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey={yAxisKey} 
              stroke={COLOR_PALETTES.professional[0]}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }} 
            />
          </LineChart>
        );
        
      case 'pie':
        return (
          <PieChart margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey={yAxisKey}
              nameKey={xAxisKey}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {data.map((_, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLOR_PALETTES.professional[index % COLOR_PALETTES.professional.length]} 
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        );
        
      default:
        return (
          <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip />
            <Legend />
            <Bar dataKey={yAxisKey} fill={COLOR_PALETTES.professional[0]} radius={[4, 4, 0, 0]} />
          </BarChart>
        );
    }
  };

  // Only use ResponsiveContainer when dimensions are relative
  return useResponsive ? (
    <div className={`w-full h-full ${className}`}>
      <ResponsiveContainer width={width} height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  ) : (
    <div className={`${className}`} style={{ width, height }}>
      {renderChart()}
    </div>
  );
};

export default ChartWrapper;
