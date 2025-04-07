
import React from 'react';
import { Card } from "@/components/ui/card";
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QueryResult } from '@/services/types/queryTypes';
import { 
  BarChart as RechartsBarChart,
  LineChart as RechartsLineChart,
  PieChart as RechartsPieChart,
  Bar, Line, Pie,
  XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer,
  Cell
} from 'recharts';

interface EnhancedVisualizationProps {
  result: QueryResult;
  height?: number;
}

const COLORS = [
  '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', 
  '#a4de6c', '#d0ed57', '#ffc658', '#ff8042',
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042'
];

const EnhancedVisualization: React.FC<EnhancedVisualizationProps> = ({ 
  result,
  height = 300
}) => {
  if (!result) {
    return (
      <Card className="flex justify-center items-center p-6 h-60 glass-card">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const chartData = prepareChartData(result);
  
  if (result.error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    );
  }

  // Define chart type, defaulting to bar chart if not specified
  const chartType = result.chartType || result.chart_type || 'bar';
  
  // Get axis names - use both naming conventions for compatibility
  const xAxis = result.xAxis || result.x_axis;
  const yAxis = result.yAxis || result.y_axis;
  
  if (!chartData || chartData.length === 0) {
    return (
      <Card className="flex justify-center items-center p-6 h-60 glass-card">
        <p className="text-muted-foreground">No data available for visualization</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 glass-card">
      <div className="w-full" style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          {renderChart(chartType, chartData, xAxis, yAxis)}
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

// Helper function to render the appropriate chart type
const renderChart = (chartType: string, chartData: any[], xAxis?: string, yAxis?: string) => {
  switch (chartType) {
    case 'bar':
      return (
        <RechartsBarChart
          data={chartData}
          margin={{ top: 20, right: 20, left: 20, bottom: 50 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis 
            dataKey="name" 
            angle={-45} 
            textAnchor="end" 
            height={70} 
            stroke="#888"
            tick={{ fill: '#ccc', fontSize: 12 }}
          />
          <YAxis stroke="#888" tick={{ fill: '#ccc' }} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(30, 30, 30, 0.9)', borderColor: '#666' }}
            labelStyle={{ color: '#eee' }}
          />
          <Legend wrapperStyle={{ paddingTop: 10 }} />
          <Bar 
            dataKey="value" 
            name={yAxis} 
            fill="url(#colorGradient)" 
            radius={[4, 4, 0, 0]} 
          />
          <defs>
            <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0.3}/>
            </linearGradient>
          </defs>
        </RechartsBarChart>
      );
    case 'line':
      return (
        <RechartsLineChart
          data={chartData}
          margin={{ top: 20, right: 20, left: 20, bottom: 50 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis 
            dataKey="name" 
            angle={-45} 
            textAnchor="end" 
            height={70} 
            stroke="#888"
            tick={{ fill: '#ccc', fontSize: 12 }}
          />
          <YAxis stroke="#888" tick={{ fill: '#ccc' }} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(30, 30, 30, 0.9)', borderColor: '#666' }}
            labelStyle={{ color: '#eee' }}
          />
          <Legend wrapperStyle={{ paddingTop: 10 }} />
          <Line 
            type="monotone" 
            dataKey="value" 
            name={yAxis} 
            stroke="#8884d8" 
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 8 }}
          />
        </RechartsLineChart>
      );
    case 'pie':
      return (
        <RechartsPieChart
          margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
        >
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(30, 30, 30, 0.9)', borderColor: '#666' }}
            labelStyle={{ color: '#eee' }}
            formatter={(value, name) => [`${value}`, `${name}`]}
          />
          <Legend layout="vertical" verticalAlign="middle" align="right" />
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </RechartsPieChart>
      );
    default:
      return (
        <RechartsBarChart
          data={chartData}
          margin={{ top: 20, right: 20, left: 20, bottom: 50 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="value" fill="#8884d8" />
        </RechartsBarChart>
      );
  }
};

// Helper function to prepare chart data from various formats
const prepareChartData = (result: QueryResult) => {
  // If data is empty, return empty array
  if (!result.data || result.data.length === 0) {
    return [];
  }
  
  try {
    // Get axis names from result (use either naming convention)
    const xAxis = result.xAxis || result.x_axis;
    const yAxis = result.yAxis || result.y_axis;
    
    if (!xAxis || !yAxis) {
      console.error('Missing axis configuration in result', result);
      return [];
    }
    
    // Map the data to chart format
    return result.data.map(item => ({
      name: String(item[xAxis] || ''),
      value: Number(item[yAxis] || 0)
    })).filter(item => !isNaN(item.value));
  } catch (error) {
    console.error('Error preparing chart data:', error);
    return [];
  }
};

export default EnhancedVisualization;
