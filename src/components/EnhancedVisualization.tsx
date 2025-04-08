
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
  // Use the color scheme provided by the AI if available
  const effectiveColorPalette = (result.color_scheme as keyof typeof COLOR_PALETTES) || colorPalette;
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

  // Ensure we have valid data by preparing it here
  const chartData = useMemo(() => {
    if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
      console.error('Missing or empty data in visualization result', result);
      return [];
    }
    
    // Make sure we're using valid data
    return prepareChartData(result);
  }, [result]);
  
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
    // Debug information if no chart data
    console.error('No chart data after preparation', {
      result,
      originalData: result.data?.slice(0, 3),
      xAxis,
      yAxis
    });
    
    return (
      <Card className={`flex flex-col justify-center items-center p-6 h-60 glass-card ${className}`}>
        <p className="text-muted-foreground mb-2">No data available for visualization</p>
        <p className="text-xs text-muted-foreground">
          Please try again with a different query or dataset
        </p>
      </Card>
    );
  }
  
  const total = chartData.reduce((acc, item) => acc + (Number(item.value) || 0), 0);
  const { xTicks, yTicks } = getOptimalTickCount(
    containerSize.width || 500, 
    containerSize.height || height
  );

  // Choose chart icon based on type
  const ChartIcon = chartType === 'bar' ? BarChartIcon : 
                    chartType === 'line' ? LineChartIcon : PieChart;

  // Display additional stats if available
  const stats = result.stats;

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
          {chartData.length > 0 ? (
            <ChartContainer
              config={{
                ...chartData.reduce((acc, item, index) => {
                  const color = COLOR_PALETTES[effectiveColorPalette][index % COLOR_PALETTES[effectiveColorPalette].length];
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
                colorPalette: effectiveColorPalette,
                activeIndex,
                setActiveIndex,
                xTicks,
                yTicks,
                height
              })}
            </ChartContainer>
          ) : (
            <div className="flex h-full justify-center items-center">
              <p className="text-muted-foreground">No data available for visualization</p>
            </div>
          )}
        </div>

        {/* Show statistics summary if available */}
        {stats && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
            {stats.min !== undefined && (
              <div className="bg-gray-900/30 p-2 rounded-md text-center">
                <div className="text-xs text-gray-400">Minimum</div>
                <div className="font-medium">{formatChartValue(stats.min)}</div>
              </div>
            )}
            {stats.max !== undefined && (
              <div className="bg-gray-900/30 p-2 rounded-md text-center">
                <div className="text-xs text-gray-400">Maximum</div>
                <div className="font-medium">{formatChartValue(stats.max)}</div>
              </div>
            )}
            {stats.avg !== undefined && (
              <div className="bg-gray-900/30 p-2 rounded-md text-center">
                <div className="text-xs text-gray-400">Average</div>
                <div className="font-medium">{formatChartValue(stats.avg)}</div>
              </div>
            )}
            {stats.sum !== undefined && (
              <div className="bg-gray-900/30 p-2 rounded-md text-center">
                <div className="text-xs text-gray-400">Total</div>
                <div className="font-medium">{formatChartValue(stats.sum)}</div>
              </div>
            )}
          </div>
        )}
        
        {result.explanation && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
            <p className="text-sm text-muted-foreground">{result.explanation}</p>
            {result.model_used && (
              <div className="mt-2 text-xs text-right text-muted-foreground">
                Generated using {result.model_used}
              </div>
            )}
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

  // Add error handling for chart rendering
  try {
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
              isAnimationActive={true}
            />
          </LineChart>
        );
      case 'pie':
        // Extra check for pie chart data
        if (chartData.some(item => typeof item.value !== 'number')) {
          console.warn('Pie chart has non-numeric values', chartData);
          // Convert all values to numbers
          chartData = chartData.map(item => ({
            ...item,
            value: Number(item.value) || 0
          }));
        }
        
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
              isAnimationActive={true}
              label={({name, percent, value, cx, cy, midAngle, innerRadius, outerRadius }) => {
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
                      ? `${(percent * 100).toFixed(1)}%`
                      : formatChartValue(value)}
                  </text>
                );
              }}
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
              activeIndex={activeIndex !== null ? activeIndex : undefined}
              activeShape={(props) => {
                const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, name, value } = props;
                const percent = value / total;
                
                return (
                  <>
                    <Sector
                      cx={cx}
                      cy={cy}
                      innerRadius={innerRadius}
                      outerRadius={outerRadius + 10}
                      startAngle={startAngle}
                      endAngle={endAngle}
                      fill={fill}
                      opacity={0.9}
                      stroke="#333"
                      strokeWidth={1}
                    />
                    <Sector
                      cx={cx}
                      cy={cy}
                      startAngle={startAngle}
                      endAngle={endAngle}
                      innerRadius={innerRadius - 4}
                      outerRadius={innerRadius - 2}
                      fill={fill}
                    />
                    <text
                      x={cx}
                      y={cy - 20}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#fff"
                      fontSize={16}
                      fontWeight="bold"
                    >
                      {name}
                    </text>
                    <text
                      x={cx}
                      y={cy + 10}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#fff"
                      fontSize={14}
                    >
                      {displayMode === 'percentages'
                        ? `${(percent * 100).toFixed(1)}%`
                        : formatChartValue(value)}
                    </text>
                  </>
                );
              }}
            >
              {chartData.map((entry, index) => (
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
  } catch (error) {
    console.error('Error rendering chart:', error);
    return (
      <div className="h-full flex flex-col items-center justify-center">
        <p className="text-red-500 mb-2">Error rendering visualization</p>
        <p className="text-xs text-gray-400">{error.message}</p>
      </div>
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
    
    // Check if the data is in the expected format
    const firstItem = result.data[0];
    if (!firstItem.hasOwnProperty(xAxis) || !firstItem.hasOwnProperty(yAxis)) {
      console.error(`Data does not contain expected axes properties: ${xAxis}, ${yAxis}`, firstItem);
      
      // Try to recover by finding valid properties
      const keys = Object.keys(firstItem);
      if (keys.length >= 2) {
        // If we have at least two properties, use the first as x and second as y
        console.log(`Attempting recovery using: ${keys[0]}, ${keys[1]}`);
        return result.data
          .map(item => ({
            name: String(item[keys[0]] || ''),
            value: Number(item[keys[1]] || 0)
          }))
          .filter(item => !isNaN(item.value) && item.name)
          .sort((a, b) => b.value - a.value)
          .slice(0, 20);
      } else {
        // Not enough properties to create a visualization
        return [];
      }
    }
    
    // Normal processing
    return result.data
      .map(item => ({
        name: String(item[xAxis] !== undefined ? item[xAxis] : ''),
        value: Number(item[yAxis] !== undefined ? item[yAxis] : 0)
      }))
      .filter(item => !isNaN(item.value) && item.name)
      .sort((a, b) => b.value - a.value)
      .slice(0, 20);
  } catch (error) {
    console.error('Error preparing chart data:', error);
    return [];
  }
};

export default EnhancedVisualization;
