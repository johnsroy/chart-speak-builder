
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
  
  // Set up common props for axes without using defaultProps
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
    width: 80,
  };

  // Make sure data is valid before rendering
  const validData = Array.isArray(data) ? data : [];
  
  // Check if we have enough data to render a meaningful chart
  if (validData.length === 0) {
    return (
      <div className={`flex items-center justify-center w-full h-full ${className}`}>
        <p className="text-gray-400">No data available for visualization</p>
      </div>
    );
  }

  const renderChart = () => {
    switch ((chartType || '').toLowerCase()) {
      case 'bar':
        return (
          <BarChart data={validData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
          <LineChart data={validData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
          <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <Pie
              data={validData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={validData.length > 10 ? 120 : 150}
              fill="#8884d8"
              dataKey={yAxisKey}
              nameKey={xAxisKey}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {validData.map((_, index) => (
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
          <BarChart data={validData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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

  // Return appropriate container based on dimensions
  if (!useResponsive) {
    return (
      <div className={`${className}`} style={{ width, height }}>
        {renderChart()}
      </div>
    );
  }

  // Make sure height is set to a reasonable value when using ResponsiveContainer
  const containerHeight = height === '100%' ? '100%' : typeof height === 'number' ? height : 400;
  
  return (
    <div className={`w-full h-full ${className}`}>
      <ResponsiveContainer width="100%" height={containerHeight} minHeight={300}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};

export default ChartWrapper;
