
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Info, Percent, Hash, PieChart, BarChart as BarChartIcon, LineChart as LineChartIcon } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { QueryResult } from '@/services/types/queryTypes';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@/components/ui/chart';
import {
  BarChart,
  LineChart,
  PieChart as RechartsPie,
  Bar, 
  Line, 
  Pie,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  Cell,
  LabelList,
  Sector
} from 'recharts';
import { COLOR_PALETTES, generateChartColors, formatChartValue, formatPercentage, getOptimalTickCount } from '@/utils/chartUtils';

interface EnhancedVisualizationProps {
  result: QueryResult;
  height?: number;
  className?: string;
  showTitle?: boolean;
  colorPalette?: keyof typeof COLOR_PALETTES;
}

type DisplayMode = 'values' | 'percentages';

const EnhancedVisualization: React.FC<EnhancedVisualizationProps> = ({ 
  result,
  height = 300,
  className = "",
  showTitle = true,
  colorPalette = 'professional'
}) => {
  const [displayMode, setDisplayMode] = useState<DisplayMode>('values');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  // Set up resize observer to get accurate container dimensions
  useEffect(() => {
    if (!containerRef.current) return;
    
    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });
    
    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  if (!result) {
    return (
      <Card className={`flex justify-center items-center p-6 h-60 glass-card ${className}`}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  const chartData = prepareChartData(result);
  
  if (result.error) {
    return (
      <Alert variant="destructive" className={`mt-4 ${className}`}>
        <AlertDescription>{result.error}</AlertDescription>
      </Alert>
    );
  }

  const chartType = result.chartType || result.chart_type || 'bar';
  
  const xAxis = result.xAxis || result.x_axis;
  const yAxis = result.yAxis || result.y_axis;
  
  if (!chartData || chartData.length === 0) {
    return (
      <Card className={`flex justify-center items-center p-6 h-60 glass-card ${className}`}>
        <p className="text-muted-foreground">No data available for visualization</p>
      </Card>
    );
  }
  
  const total = chartData.reduce((acc, item) => acc + item.value, 0);
  const { xTicks, yTicks } = getOptimalTickCount(
    containerSize.width || 500, 
    containerSize.height || height
  );

  // Choose chart icon based on type
  const ChartIcon = chartType === 'bar' ? BarChartIcon : 
                    chartType === 'line' ? LineChartIcon : PieChart;

  return (
    <Card className={`glass-card overflow-hidden shadow-lg ${className}`} ref={containerRef}>
      {showTitle && result.chart_title && (
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-xl">
            <ChartIcon className="h-5 w-5 text-primary" />
            {result.chart_title}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-gray-400 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{result.explanation || 'Visualization based on your query'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={`${showTitle ? 'pt-4' : 'pt-6'} pb-6`}>
        {(chartType === 'bar' || chartType === 'pie') && (
          <div className="mb-4 flex justify-end">
            <ToggleGroup 
              type="single" 
              value={displayMode}
              onValueChange={(value) => value && setDisplayMode(value as DisplayMode)}
              className="border rounded-md"
            >
              <ToggleGroupItem value="values" className="flex items-center gap-1">
                <Hash className="h-3.5 w-3.5" />
                <span className="text-xs">Values</span>
              </ToggleGroupItem>
              <ToggleGroupItem value="percentages" className="flex items-center gap-1">
                <Percent className="h-3.5 w-3.5" />
                <span className="text-xs">Percentages</span>
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        )}
        <div className="w-full" style={{ height: `${height}px` }}>
          <ChartContainer
            config={{
              ...chartData.reduce((acc, item, index) => {
                const color = COLOR_PALETTES[colorPalette][index % COLOR_PALETTES[colorPalette].length];
                return { 
                  ...acc, 
                  [item.name]: { 
                    color 
                  } 
                };
              }, {})
            }}
          >
            {renderChart({
              chartType,
              chartData,
              xAxis,
              yAxis,
              displayMode,
              total,
              colorPalette,
              activeIndex,
              setActiveIndex,
              xTicks,
              yTicks,
              height
            })}
          </ChartContainer>
        </div>
        {result.explanation && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
            <p className="text-sm text-muted-foreground">{result.explanation}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

interface RenderChartProps {
  chartType: string;
  chartData: any[];
  xAxis?: string;
  yAxis?: string;
  displayMode: DisplayMode;
  total: number;
  colorPalette: keyof typeof COLOR_PALETTES;
  activeIndex: number | null;
  setActiveIndex: React.Dispatch<React.SetStateAction<number | null>>;
  xTicks: number;
  yTicks: number;
  height: number;
}

const renderChart = ({
  chartType, 
  chartData, 
  xAxis, 
  yAxis,
  displayMode,
  total,
  colorPalette,
  activeIndex,
  setActiveIndex,
  xTicks,
  yTicks,
  height
}: RenderChartProps) => {
  const colors = generateChartColors(chartData.length, colorPalette);

  const onPieEnter = (_, index: number) => {
    setActiveIndex(index);
  };
  
  const onPieLeave = () => {
    setActiveIndex(null);
  };

  switch (chartType) {
    case 'bar':
      return (
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 20, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#555" opacity={0.2} />
          <XAxis 
            dataKey="name" 
            angle={-45} 
            textAnchor="end" 
            height={70}
            tick={{ fill: '#ccc', fontSize: 12 }}
            tickCount={xTicks}
            interval={0}
            tickMargin={8}
          />
          <YAxis 
            tickCount={yTicks}
            tick={{ fill: '#ccc' }} 
            tickFormatter={(value) => {
              return displayMode === 'percentages' 
                ? formatPercentage(value, total)
                : formatChartValue(value);
            }}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent 
                formatter={(value: any) => {
                  if (displayMode === 'percentages') {
                    return formatPercentage(value, total);
                  }
                  return formatChartValue(value);
                }} 
              />
            }
          />
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            content={<ChartLegendContent />}
          />
          <Bar 
            dataKey="value" 
            name={yAxis} 
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
            <LabelList 
              dataKey="value" 
              position="top" 
              fill="#ccc"
              formatter={(value: number) => {
                if (value < total * 0.03) return ''; // Don't show labels for small values
                return displayMode === 'percentages'
                  ? formatPercentage(value, total)
                  : formatChartValue(value);
              }}
            />
          </Bar>
        </BarChart>
      );
    case 'line':
      return (
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 20, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#555" opacity={0.2} />
          <XAxis 
            dataKey="name" 
            angle={-45} 
            textAnchor="end" 
            height={70}
            tick={{ fill: '#ccc', fontSize: 12 }}
            tickCount={xTicks}
            interval={0}
            tickMargin={8}
          />
          <YAxis 
            tickCount={yTicks}
            tick={{ fill: '#ccc' }} 
            tickFormatter={(value) => formatChartValue(value)}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent formatter={(value: any) => formatChartValue(value)} />
            }
          />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            content={<ChartLegendContent />}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            name={yAxis} 
            stroke={colors[0]} 
            strokeWidth={3}
            dot={{ r: 6, strokeWidth: 2, fill: '#282c34' }}
            activeDot={{ r: 8, strokeWidth: 2 }}
          />
        </LineChart>
      );
    case 'pie':
      return (
        <RechartsPie
          margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
        >
          <ChartTooltip
            content={
              <ChartTooltipContent 
                formatter={(value: any, name: any) => {
                  if (displayMode === 'percentages') {
                    return [formatPercentage(value, total), name];
                  }
                  return [formatChartValue(value), name];
                }}
              />
            }
          />
          <Legend 
            layout="horizontal" 
            verticalAlign="bottom" 
            align="center"
            content={<ChartLegendContent nameKey="name" />}
          />
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={Math.min(height * 0.35, 120)}
            dataKey="value"
            nameKey="name"
            label={({name, percent, value, cx, cy, midAngle, innerRadius, outerRadius }) => {
              // Only show label for segments that are large enough
              if (percent < 0.05) return null;
              
              const RADIAN = Math.PI / 180;
              const radius = 25 + innerRadius + (outerRadius - innerRadius);
              const x = cx + radius * Math.cos(-midAngle * RADIAN);
              const y = cy + radius * Math.sin(-midAngle * RADIAN);
              
              return (
                <text
                  x={x}
                  y={y}
                  textAnchor={x > cx ? 'start' : 'end'}
                  dominantBaseline="central"
                  fill="#ccc"
                  fontSize={12}
                >
                  {displayMode === 'percentages'
                    ? formatPercentage(value, total)
                    : formatChartValue(value)}
                </text>
              );
            }}
            onMouseEnter={onPieEnter}
            onMouseLeave={onPieLeave}
            activeIndex={activeIndex !== null ? activeIndex : undefined}
            activeShape={(props) => {
              const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
              return (
                <Sector
                  cx={cx}
                  cy={cy}
                  innerRadius={innerRadius}
                  outerRadius={outerRadius + 10}
                  startAngle={startAngle}
                  endAngle={endAngle}
                  fill={fill}
                />
              );
            }}
          >
            {chartData.map((_, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={colors[index % colors.length]}
                stroke="#444"
                strokeWidth={1}
              />
            ))}
          </Pie>
        </RechartsPie>
      );
    default:
      return (
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 20, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#555" opacity={0.2} />
          <XAxis 
            dataKey="name" 
            angle={-45} 
            textAnchor="end" 
            height={70}
            tick={{ fill: '#ccc', fontSize: 12 }}
          />
          <YAxis tick={{ fill: '#ccc' }} />
          <ChartTooltip
            content={<ChartTooltipContent />}
          />
          <Bar dataKey="value" name={yAxis}>
            {chartData.map((_, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      );
  }
};

const prepareChartData = (result: QueryResult) => {
  if (!result.data || result.data.length === 0) {
    return [];
  }
  
  try {
    const xAxis = result.xAxis || result.x_axis;
    const yAxis = result.yAxis || result.y_axis;
    
    if (!xAxis || !yAxis) {
      console.error('Missing axis configuration in result', result);
      return [];
    }
    
    // Extract and transform data for visualization
    return result.data
      .map(item => ({
        name: String(item[xAxis] || ''),
        value: Number(item[yAxis] || 0)
      }))
      .filter(item => !isNaN(item.value) && item.name)
      .sort((a, b) => b.value - a.value) // Sort from highest to lowest value
      .slice(0, 20); // Limit to 20 items maximum for readability
  } catch (error) {
    console.error('Error preparing chart data:', error);
    return [];
  }
};

export default EnhancedVisualization;
