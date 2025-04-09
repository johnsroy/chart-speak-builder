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
  Sector,
  ScatterChart,
  Scatter,
  AreaChart,
  Area
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
  const effectiveColorPalette = (result.color_scheme as keyof typeof COLOR_PALETTES) || colorPalette;
  const [displayMode, setDisplayMode] = useState<DisplayMode>('values');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
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

  const chartData = useMemo(() => {
    if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
      console.error('Missing or empty data in visualization result', result);
      return [];
    }
    
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

  const ChartIcon = chartType === 'bar' ? BarChartIcon : 
                    chartType === 'line' ? LineChartIcon : PieChart;

  const stats = result.stats;

  return (
    <Card className={`glass-card overflow-hidden shadow-lg ${className} w-full max-w-4xl mx-auto`} ref={containerRef}>
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

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };
  
  const onPieLeave = () => {
    setActiveIndex(null);
  };

  try {
    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
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
          </ResponsiveContainer>
        );
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
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
                  <ChartTooltipContent 
                    formatter={(value: any) => formatChartValue(value)} 
                  />
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
                strokeWidth={2}
                dot={{ fill: colors[0], r: 4, strokeWidth: 1 }}
                activeDot={{ r: 6, fill: colors[0] }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      case 'pie':
        const renderActiveShape = (props: any) => {
          const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
        
          return (
            <g>
              <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 6}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
              />
            </g>
          );
        };
        
        return (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsPie 
              margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
            >
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={Math.min(height * 0.35, 120)}
                label={(entry) => entry.name}
                labelLine={true}
                activeIndex={activeIndex !== null ? activeIndex : undefined}
                activeShape={renderActiveShape}
                onMouseEnter={onPieEnter}
                onMouseLeave={onPieLeave}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
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
                layout="horizontal"
                verticalAlign="bottom" 
                align="center"
                content={<ChartLegendContent />}
              />
            </RechartsPie>
          </ResponsiveContainer>
        );
      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 20, right: 20, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#555" opacity={0.2} />
              <XAxis 
                dataKey="x" 
                name={xAxis}
                type="number" 
                tick={{ fill: '#ccc' }} 
                tickCount={xTicks}
                tickFormatter={(value) => formatChartValue(value)}
              />
              <YAxis 
                dataKey="value" 
                name={yAxis}
                type="number" 
                tickCount={yTicks}
                tick={{ fill: '#ccc' }} 
                tickFormatter={(value) => formatChartValue(value)}
              />
              <ChartTooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={
                  <ChartTooltipContent 
                    formatter={(value: any) => formatChartValue(value)} 
                  />
                }
              />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                content={<ChartLegendContent />}
              />
              <Scatter 
                name={yAxis} 
                data={chartData} 
                fill={colors[0]}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        );
      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
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
                  <ChartTooltipContent 
                    formatter={(value: any) => formatChartValue(value)} 
                  />
                }
              />
              <Legend 
                verticalAlign="bottom" 
                height={36} 
                content={<ChartLegendContent />}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                name={yAxis} 
                stroke={colors[0]}
                fill={colors[0]}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      default:
        return (
          <ResponsiveContainer width="100%" height="100%">
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
                tickFormatter={(value) => formatChartValue(value)}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent 
                    formatter={(value: any) => formatChartValue(value)} 
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
                name={yAxis || 'Value'} 
                fill={colors[0]}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );
    }
  } catch (error) {
    console.error("Error rendering chart:", error);
    return (
      <div className="flex h-full justify-center items-center">
        <p className="text-red-400">Error rendering chart</p>
      </div>
    );
  }
};

const prepareChartData = (result: QueryResult) => {
  try {
    const { data } = result;
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }
    
    if (data[0].name !== undefined && data[0].value !== undefined) {
      return data;
    }
    
    const xAxis = result.xAxis || result.x_axis || Object.keys(data[0])[0];
    const yAxis = result.yAxis || result.y_axis || Object.keys(data[0])[1];
    
    console.log("Using axes:", { xAxis, yAxis });
    
    if (!data[0][xAxis] && !data[0][yAxis]) {
      console.log("Data does not contain expected axes properties:", xAxis, yAxis, data[0]);
      
      const xField = Object.keys(data[0]).find(key => 
        key.toLowerCase().includes('name') || 
        key.toLowerCase().includes('category') || 
        key.toLowerCase().includes('label') ||
        key.toLowerCase().includes('id')
      );
      
      const yField = Object.keys(data[0]).find(key => 
        key.toLowerCase().includes('value') || 
        key.toLowerCase().includes('count') || 
        key.toLowerCase().includes('amount') ||
        typeof data[0][key] === 'number'
      );
      
      console.log("Attempting recovery using:", xField, yField);
      
      if (xField && yField) {
        return data.map(item => ({
          name: String(item[xField]),
          value: Number(item[yField]) || 0
        }));
      }
      
      const firstStringField = Object.keys(data[0]).find(key => typeof data[0][key] === 'string');
      const firstNumberField = Object.keys(data[0]).find(key => typeof data[0][key] === 'number');
      
      if (firstStringField && firstNumberField) {
        console.log("Using first string and number fields:", firstStringField, firstNumberField);
        return data.map(item => ({
          name: String(item[firstStringField]),
          value: Number(item[firstNumberField]) || 0
        }));
      }
    }
    
    return data.map(item => ({
      name: String(item[xAxis]),
      value: Number(item[yAxis]) || 0
    }));
  } catch (error) {
    console.error("Error preparing chart data:", error);
    return [];
  }
};

export default EnhancedVisualization;
