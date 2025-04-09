
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
  height = 500, // Increased default height
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
    height: 60, // Increased height for x-axis
    angle: data.length > 8 ? -45 : 0, // Angle labels if many data points
    textAnchor: data.length > 8 ? 'end' : 'middle', // Align text based on angle
    interval: 0, // Show all labels
  };
  
  const yAxisProps = {
    stroke: '#888',
    fontSize: 12,
    tickLine: false,
    axisLine: true,
    width: 100, // Increased width for y-axis
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

  // For larger datasets, limit the visible data points to improve performance
  // This is especially important for bar charts with many items
  const processDataForDisplay = () => {
    if (validData.length <= 50 || chartType === 'line') {
      return validData;
    }

    // For bar charts and pie charts with many items, sample the data
    if (chartType === 'bar' && validData.length > 50) {
      // Limit to 50 items for bar charts
      return validData.slice(0, 50);
    }

    if (chartType === 'pie' && validData.length > 15) {
      // For pie charts, limit to 15 slices to maintain readability
      return validData.slice(0, 15);
    }

    return validData;
  };

  const displayData = processDataForDisplay();

  const renderChart = () => {
    switch ((chartType || '').toLowerCase()) {
      case 'bar':
        return (
          <BarChart data={displayData} margin={{ top: 20, right: 50, left: 20, bottom: 70 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip wrapperStyle={{ maxWidth: '300px' }} />
            <Legend wrapperStyle={{ marginTop: '10px' }} />
            <Bar 
              dataKey={yAxisKey} 
              fill={COLOR_PALETTES.professional[0]} 
              radius={[4, 4, 0, 0]} 
              barSize={displayData.length > 20 ? 6 : displayData.length > 10 ? 10 : 30} // Adjust bar size based on data points
            />
          </BarChart>
        );
        
      case 'line':
        return (
          <LineChart data={displayData} margin={{ top: 20, right: 50, left: 20, bottom: 70 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip wrapperStyle={{ maxWidth: '300px' }} />
            <Legend wrapperStyle={{ marginTop: '10px' }} />
            <Line 
              type="monotone" 
              dataKey={yAxisKey} 
              stroke={COLOR_PALETTES.professional[0]}
              strokeWidth={2}
              dot={{ r: displayData.length > 100 ? 0 : 4 }} // Remove dots for large datasets
              activeDot={{ r: 6 }} 
            />
          </LineChart>
        );
        
      case 'pie':
        return (
          <PieChart margin={{ top: 20, right: 50, left: 20, bottom: 70 }}>
            <Pie
              data={displayData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={Math.min(200, displayData.length > 15 ? 150 : 200)} // Adjusted for better visibility
              fill="#8884d8"
              dataKey={yAxisKey}
              nameKey={xAxisKey}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {displayData.map((_, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={COLOR_PALETTES.professional[index % COLOR_PALETTES.professional.length]} 
                />
              ))}
            </Pie>
            <Tooltip wrapperStyle={{ maxWidth: '300px' }} />
            <Legend wrapperStyle={{ marginTop: '10px' }} layout="horizontal" verticalAlign="bottom" align="center" />
          </PieChart>
        );
        
      default:
        return (
          <BarChart data={displayData} margin={{ top: 20, right: 50, left: 20, bottom: 70 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
            <XAxis {...xAxisProps} />
            <YAxis {...yAxisProps} />
            <Tooltip wrapperStyle={{ maxWidth: '300px' }} />
            <Legend wrapperStyle={{ marginTop: '10px' }} />
            <Bar 
              dataKey={yAxisKey} 
              fill={COLOR_PALETTES.professional[0]} 
              radius={[4, 4, 0, 0]} 
              barSize={displayData.length > 20 ? 6 : displayData.length > 10 ? 10 : 30}
            />
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
  const containerHeight = height === '100%' ? '100%' : typeof height === 'number' ? height : 500;
  
  return (
    <div className={`w-full h-full ${className}`}>
      <ResponsiveContainer width="100%" height={containerHeight} minHeight={500}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};

export default ChartWrapper;
