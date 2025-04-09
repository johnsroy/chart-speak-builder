
import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import {
  BarChart as BarChartIcon,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Loader2,
  CircleDot,
} from 'lucide-react';
import { getFieldOptions, processChartData, generateChartColors } from '@/utils/chartUtils';
import { ChartType } from '@/utils/chartSuggestionUtils';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts';
import HighchartsReact from 'highcharts-react-official';
import Highcharts from 'highcharts';
import HC_more from 'highcharts/highcharts-more';
import HC_exporting from 'highcharts/modules/exporting';
import HC_exportData from 'highcharts/modules/export-data';

// Initialize Highcharts modules
if (typeof Highcharts === 'object') {
  HC_more(Highcharts);
  HC_exporting(Highcharts);
  HC_exportData(Highcharts);
}

interface ChartVisualizationProps {
  datasetId: string;
  chartType: ChartType;
  data?: any[] | null;
  useDirectAccess?: boolean;
  heightClass?: string;
  className?: string;
}

interface ChartField {
  field: string;
  type: string;
}

export interface ChartDimension {
  x: ChartField;
  y: ChartField;
}

const ChartVisualization: React.FC<ChartVisualizationProps> = ({
  datasetId,
  chartType,
  data: externalData,
  useDirectAccess = false,
  heightClass = 'h-[400px]',
  className = '',
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [chartDimension, setChartDimension] = useState<ChartDimension | null>(null);
  const [dataset, setDataset] = useState<any>(null);

  useEffect(() => {
    if (externalData && externalData.length > 0) {
      setData(externalData);
      setLoading(false);
      
      // Auto-determine chart dimensions
      autoSelectDimensions(externalData);
    } else if (useDirectAccess && !externalData) {
      setLoading(true);
      // Implement data loading logic here if needed
      setLoading(false);
    }
  }, [externalData, datasetId, useDirectAccess]);

  const autoSelectDimensions = (data: any[]) => {
    if (!data || data.length === 0) return;
    
    const sample = data[0];
    const fields = Object.keys(sample);
    
    if (fields.length < 2) {
      setError("Dataset must have at least 2 columns");
      return;
    }

    // Find a categorical field for x-axis (string or date)
    // and a numerical field for y-axis
    let xField = fields.find(f => typeof sample[f] === 'string' || sample[f] instanceof Date);
    let yField = fields.find(f => typeof sample[f] === 'number');
    
    // If no string field found, use the first field
    if (!xField) xField = fields[0];
    // If no number field found, use the second field
    if (!yField) yField = fields[1];

    setChartDimension({
      x: { field: xField, type: typeof sample[xField] },
      y: { field: yField, type: typeof sample[yField] },
    });
  };
  
  // Prepare Highcharts options based on chart type
  const highchartsOptions = useMemo(() => {
    if (!data || data.length === 0 || !chartDimension) return null;

    const { x, y } = chartDimension;
    const colors = generateChartColors(10, 'professional');
    
    // Common options base
    const baseOptions = {
      chart: {
        backgroundColor: 'transparent',
        style: {
          fontFamily: 'Inter, sans-serif',
          color: '#ffffff'
        }
      },
      title: {
        text: '',
        style: { color: '#ffffff' }
      },
      xAxis: {
        title: {
          text: x?.field,
          style: { color: '#a0aec0' }
        },
        labels: {
          style: { color: '#a0aec0' }
        },
        lineColor: '#4a5568',
        tickColor: '#4a5568'
      },
      yAxis: {
        title: {
          text: y?.field,
          style: { color: '#a0aec0' }
        },
        labels: {
          style: { color: '#a0aec0' }
        },
        gridLineColor: 'rgba(74, 85, 104, 0.2)'
      },
      legend: {
        itemStyle: { color: '#a0aec0' },
        itemHoverStyle: { color: '#ffffff' }
      },
      tooltip: {
        backgroundColor: 'rgba(26, 32, 44, 0.9)',
        style: { color: '#ffffff' },
        borderWidth: 0,
        shadow: true
      },
      credits: {
        enabled: false
      },
      colors: colors,
      exporting: {
        enabled: true,
        buttons: {
          contextButton: {
            menuItems: ['downloadPNG', 'downloadJPEG', 'downloadPDF', 'downloadSVG', 'separator', 'downloadCSV', 'downloadXLS']
          }
        }
      }
    };

    switch (chartType) {
      case 'bar':
        return {
          ...baseOptions,
          chart: {
            ...baseOptions.chart,
            type: 'bar'
          },
          plotOptions: {
            bar: {
              dataLabels: {
                enabled: true,
                style: { color: '#a0aec0' }
              }
            }
          },
          series: [{
            name: y.field,
            data: data.map(item => ({
              name: item[x.field]?.toString(),
              y: Number(item[y.field]) || 0
            }))
          }]
        };
      
      case 'column':
        return {
          ...baseOptions,
          chart: {
            ...baseOptions.chart,
            type: 'column'
          },
          plotOptions: {
            column: {
              dataLabels: {
                enabled: true,
                style: { color: '#a0aec0' }
              }
            }
          },
          series: [{
            name: y.field,
            data: data.map(item => ({
              name: item[x.field]?.toString(),
              y: Number(item[y.field]) || 0
            }))
          }]
        };
      
      case 'line':
        return {
          ...baseOptions,
          chart: {
            ...baseOptions.chart,
            type: 'line'
          },
          plotOptions: {
            line: {
              marker: {
                enabled: true
              }
            }
          },
          series: [{
            name: y.field,
            data: data.map(item => ({
              name: item[x.field]?.toString(),
              y: Number(item[y.field]) || 0
            }))
          }]
        };
      
      case 'area':
        return {
          ...baseOptions,
          chart: {
            ...baseOptions.chart,
            type: 'area'
          },
          plotOptions: {
            area: {
              fillOpacity: 0.5
            }
          },
          series: [{
            name: y.field,
            data: data.map(item => ({
              name: item[x.field]?.toString(),
              y: Number(item[y.field]) || 0
            }))
          }]
        };
      
      case 'pie':
      case 'donut':
        return {
          ...baseOptions,
          chart: {
            ...baseOptions.chart,
            type: 'pie'
          },
          plotOptions: {
            pie: {
              allowPointSelect: true,
              cursor: 'pointer',
              dataLabels: {
                enabled: true,
                format: '<b>{point.name}</b>: {point.percentage:.1f} %',
                style: { color: '#ffffff' }
              },
              innerSize: chartType === 'donut' ? '50%' : '0%'
            }
          },
          series: [{
            name: y.field,
            data: data.map(item => ({
              name: item[x.field]?.toString(),
              y: Number(item[y.field]) || 0
            }))
          }]
        };
      
      case 'scatter':
        // For scatter, we need two numeric fields
        const zField = Object.keys(data[0]).find(f => 
          typeof data[0][f] === 'number' && f !== y.field
        ) || y.field;
        
        return {
          ...baseOptions,
          chart: {
            ...baseOptions.chart,
            type: 'scatter'
          },
          plotOptions: {
            scatter: {
              marker: {
                radius: 5,
                states: {
                  hover: {
                    enabled: true,
                    lineColor: 'rgb(100,100,100)'
                  }
                }
              }
            }
          },
          series: [{
            name: `${y.field} vs ${x.field}`,
            data: data.map(item => ([
              Number(item[x.field]) || 0,
              Number(item[y.field]) || 0,
            ])),
            color: colors[0]
          }]
        };
      
      case 'stacked':
        // Group data by x field and calculate series per unique value in the data
        const uniqueCategories = [...new Set(data.map(item => item[x.field]))];
        const seriesFields = Object.keys(data[0]).filter(key => 
          key !== x.field && typeof data[0][key] === 'number'
        );
        
        return {
          ...baseOptions,
          chart: {
            ...baseOptions.chart,
            type: 'column'
          },
          plotOptions: {
            column: {
              stacking: 'normal',
              dataLabels: {
                enabled: false
              }
            }
          },
          series: seriesFields.map((field, index) => ({
            name: field,
            data: uniqueCategories.map(category => {
              const item = data.find(d => d[x.field] === category) || {};
              return Number(item[field]) || 0;
            }),
            color: colors[index % colors.length]
          }))
        };
      
      default:
        return {
          ...baseOptions,
          chart: {
            ...baseOptions.chart,
            type: 'column'
          },
          series: [{
            name: y.field,
            data: data.map(item => Number(item[y.field]) || 0)
          }]
        };
    }
  }, [data, chartDimension, chartType]);

  if (loading) {
    return (
      <Card className={`flex items-center justify-center ${heightClass} ${className}`}>
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-purple-500" />
          <p className="text-gray-400">Loading chart data...</p>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`flex items-center justify-center ${heightClass} ${className}`}>
        <div className="text-center p-6">
          <p className="text-red-400">{error}</p>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className={`flex items-center justify-center ${heightClass} ${className}`}>
        <div className="text-center p-6">
          <p className="text-gray-400">No data available for visualization</p>
        </div>
      </Card>
    );
  }

  if (!chartDimension) {
    return (
      <Card className={`flex items-center justify-center ${heightClass} ${className}`}>
        <div className="text-center p-6">
          <p className="text-gray-400">Unable to determine chart dimensions</p>
        </div>
      </Card>
    );
  }

  // Use Highcharts for visualization
  return (
    <div className={`w-full ${heightClass} ${className}`}>
      {highchartsOptions && (
        <HighchartsReact
          highcharts={Highcharts}
          options={highchartsOptions}
          containerProps={{ style: { height: '100%', width: '100%' } }}
        />
      )}
    </div>
  );
};

export default ChartVisualization;
