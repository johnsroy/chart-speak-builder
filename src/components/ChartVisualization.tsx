import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, AlertTriangle, RefreshCcw } from 'lucide-react';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ChartType } from '@/utils/chartSuggestionUtils';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HighchartsMore from 'highcharts/highcharts-more';
import HighchartsSankey from 'highcharts/modules/sankey';
import HighchartsHeatmap from 'highcharts/modules/heatmap';
import HighchartsTreemap from 'highcharts/modules/treemap';
import HighchartsFunnel from 'highcharts/modules/funnel';
import HighchartsExporting from 'highcharts/modules/exporting';

// Initialize Highcharts modules
// We need to check if we're in a browser environment before initializing
if (typeof Highcharts === 'object') {
  // Apply the modules to Highcharts correctly
  HighchartsMore(Highcharts);
  HighchartsSankey(Highcharts);
  HighchartsHeatmap(Highcharts);
  HighchartsTreemap(Highcharts);
  HighchartsFunnel(Highcharts);
  HighchartsExporting(Highcharts);
  console.log('Highcharts modules initialized successfully');
}

// Define the dark theme for Highcharts
const darkTheme = {
  colors: ['#9b87f5', '#7E69AB', '#6E59A5', '#D6BCFA', '#E5DEFF', '#8B5CF6', '#A78BFA', '#C4B5FD'],
  chart: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    style: {
      fontFamily: 'Inter, sans-serif'
    }
  },
  title: {
    style: {
      color: '#E5E7EB',
      fontSize: '18px',
      fontWeight: '500'
    }
  },
  subtitle: {
    style: {
      color: '#9CA3AF'
    }
  },
  xAxis: {
    gridLineColor: '#333',
    gridLineWidth: 0.5,
    labels: {
      style: {
        color: '#9CA3AF'
      }
    },
    lineColor: '#555',
    tickColor: '#555',
    title: {
      style: {
        color: '#9CA3AF'
      }
    }
  },
  yAxis: {
    gridLineColor: '#333',
    labels: {
      style: {
        color: '#9CA3AF'
      }
    },
    lineColor: '#555',
    minorGridLineColor: '#333',
    tickColor: '#555',
    title: {
      style: {
        color: '#9CA3AF'
      }
    }
  },
  tooltip: {
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    style: {
      color: '#E5E7EB'
    },
    borderColor: '#555'
  },
  legend: {
    itemStyle: {
      color: '#E5E7EB'
    },
    itemHoverStyle: {
      color: '#FFF'
    },
    itemHiddenStyle: {
      color: '#555'
    },
    title: {
      style: {
        color: '#999'
      }
    }
  },
  credits: {
    style: {
      color: '#666'
    }
  },
  labels: {
    style: {
      color: '#CCC'
    }
  },
  plotOptions: {
    series: {
      borderColor: '#666',
      dataLabels: {
        color: '#CCC'
      }
    },
    pie: {
      borderColor: 'transparent'
    }
  }
};

// Apply the dark theme
Highcharts.setOptions(darkTheme);

interface ChartVisualizationProps {
  datasetId: string;
  chartType?: ChartType;
  xAxis?: string;
  yAxis?: string;
  heightClass?: string;
  data?: any[];
  useDirectAccess?: boolean;
}

const ChartVisualization: React.FC<ChartVisualizationProps> = ({
  datasetId,
  chartType = 'bar',
  xAxis,
  yAxis,
  heightClass = 'h-[400px]',
  data: initialData,
  useDirectAccess = false
}) => {
  const [chartData, setChartData] = useState<any[] | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const { toast } = useToast();
  
  const [loadAttempts, setLoadAttempts] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    if (initialData && initialData.length > 0) {
      console.log("Using initial data for chart:", initialData.length, "rows");
      setChartData(initialData);
      setAvailableColumns(Object.keys(initialData[0]));
      setLoading(false);
      return;
    }
    
    const loadData = async () => {
      setLoading(true);
      try {
        console.log(`Loading chart data for dataset ${datasetId}, attempt ${loadAttempts + 1}`);
        const data = await dataService.previewDataset(datasetId);
        console.log('Chart data loaded:', data?.length || 0, 'rows');
        
        if (!data || !Array.isArray(data) || data.length === 0) {
          throw new Error('No data available');
        }
        
        setChartData(data);
        
        if (data && data.length > 0) {
          setAvailableColumns(Object.keys(data[0]));
        }
        
        setError(null);
      } catch (err) {
        console.error('Error loading chart data:', err);
        setError('Failed to load data for visualization');
        
        if (loadAttempts < maxRetries) {
          console.log(`Retrying data load, attempt ${loadAttempts + 1} of ${maxRetries}`);
          setLoadAttempts(prev => prev + 1);
          
          setTimeout(() => {
            loadData();
          }, 1000 * (loadAttempts + 1));
          return;
        }
        
        toast({
          title: 'Error Visualizing Data',
          description: 'Failed to load dataset for visualization',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (datasetId && loadAttempts < maxRetries) {
      loadData();
    }
  }, [datasetId, initialData, toast, loadAttempts]);

  const determineAxes = () => {
    if (!chartData || chartData.length === 0 || !availableColumns.length) {
      console.log("Cannot determine axes: no chart data or columns available");
      return { xField: '', yField: '' };
    }

    const xField = xAxis && availableColumns.includes(xAxis) 
      ? xAxis 
      : findBestXAxisField(chartData, availableColumns);
    
    let yField = '';
    
    if (yAxis && availableColumns.includes(yAxis)) {
      yField = yAxis;
    } else {
      yField = findBestYAxisField(chartData, availableColumns, xField);
    }

    console.log(`Determined axes - X: ${xField}, Y: ${yField}`);
    return { xField, yField };
  };
  
  const findBestXAxisField = (data: any[], columns: string[]): string => {
    const firstRow = data[0];
    
    const dateField = columns.find(col => {
      const value = firstRow[col];
      return typeof value === 'string' && 
        (value.match(/^\d{4}-\d{2}-\d{2}/) || 
         value.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}/));
    });
    
    if (dateField) return dateField;
    
    if (columns.includes('Make')) return 'Make';
    if (columns.includes('make')) return 'make';
    if (columns.includes('Model')) return 'Model';
    if (columns.includes('model')) return 'model';
    
    const categoricalFields = columns.filter(col => {
      const values = data.map(row => row[col]);
      const uniqueValues = new Set(values);
      return typeof firstRow[col] === 'string' && 
        uniqueValues.size < data.length * 0.5;
    });
    
    if (categoricalFields.length > 0) return categoricalFields[0];
    
    const nonNumericField = columns.find(col => typeof firstRow[col] !== 'number');
    return nonNumericField || columns[0];
  };
  
  const findBestYAxisField = (data: any[], columns: string[], xField: string): string => {
    const firstRow = data[0];
    
    if (columns.includes('Electric Range')) return 'Electric Range';
    if (columns.includes('Base MSRP')) return 'Base MSRP';
    if (columns.includes('price')) return 'price';
    
    const numericFields = columns.filter(col => 
      col !== xField && typeof firstRow[col] === 'number'
    );
    
    if (numericFields.length > 0) return numericFields[0];
    
    const numberLikeField = columns.find(col => {
      if (col === xField) return false;
      const value = firstRow[col];
      return typeof value === 'string' && !isNaN(Number(value));
    });
    
    if (numberLikeField) return numberLikeField;
    
    return columns.find(col => col !== xField) || (columns.length > 1 ? columns[1] : columns[0]);
  };

  const getHighchartsOptions = () => {
    if (!chartData || chartData.length === 0) {
      console.log("No data available for chart options");
      return {
        chart: {
          type: 'bar',
          height: '100%'
        },
        title: {
          text: 'No Data Available'
        }
      };
    }

    const { xField, yField } = determineAxes();
    
    if (!xField || !yField) {
      console.log("Missing xField or yField for chart options");
      return {
        chart: {
          type: 'bar',
          height: '100%'
        },
        title: {
          text: 'Invalid Data Configuration'
        }
      };
    }

    console.log(`Generating chart options for ${chartType} chart with X: ${xField}, Y: ${yField}`);

    const categories = chartData.map(item => {
      const val = item[xField];
      return val !== undefined && val !== null ? String(val) : 'N/A';
    });
    
    const seriesData = chartData.map(item => {
      const val = item[yField];
      if (val === undefined || val === null) return 0;
      if (typeof val === 'number') return val;
      const numVal = Number(val);
      return !isNaN(numVal) ? numVal : 0;
    });
    
    const chartTitle = `${yField} by ${xField}`;
    
    const MAX_DATA_POINTS = 100;
    let limitedCategories = categories;
    let limitedSeriesData = seriesData;
    
    if (categories.length > MAX_DATA_POINTS) {
      limitedCategories = categories.slice(0, MAX_DATA_POINTS);
      limitedSeriesData = seriesData.slice(0, MAX_DATA_POINTS);
    }

    const commonOptions = {
      chart: {
        height: heightClass === 'h-[500px]' ? '500px' : '400px'
      },
      title: {
        text: chartTitle
      },
      credits: {
        enabled: false
      },
      exporting: {
        enabled: true,
        buttons: {
          contextButton: {
            menuItems: ['downloadPNG', 'downloadJPEG', 'downloadPDF', 'downloadCSV']
          }
        }
      }
    };
    
    switch (chartType) {
      case 'bar':
        return {
          ...commonOptions,
          chart: {
            ...commonOptions.chart,
            type: 'bar'
          },
          xAxis: {
            categories: limitedCategories,
            title: {
              text: xField
            }
          },
          yAxis: {
            title: {
              text: yField
            }
          },
          plotOptions: {
            bar: {
              colorByPoint: true
            }
          },
          series: [{
            name: yField,
            data: limitedSeriesData
          }]
        };
      
      case 'line':
        return {
          ...commonOptions,
          chart: {
            ...commonOptions.chart,
            type: 'line'
          },
          xAxis: {
            categories: limitedCategories,
            title: {
              text: xField
            }
          },
          yAxis: {
            title: {
              text: yField
            }
          },
          series: [{
            name: yField,
            data: limitedSeriesData
          }]
        };
        
      case 'pie':
        return {
          ...commonOptions,
          chart: {
            ...commonOptions.chart,
            type: 'pie'
          },
          plotOptions: {
            pie: {
              allowPointSelect: true,
              cursor: 'pointer',
              dataLabels: {
                enabled: true,
                format: '<b>{point.name}</b>: {point.percentage:.1f}%'
              }
            }
          },
          series: [{
            name: yField,
            colorByPoint: true,
            data: limitedCategories.map((name, i) => ({
              name: name,
              y: limitedSeriesData[i]
            }))
          }]
        };
        
      case 'column':
        return {
          ...commonOptions,
          chart: {
            ...commonOptions.chart,
            type: 'column'
          },
          xAxis: {
            categories: limitedCategories,
            title: {
              text: xField
            }
          },
          yAxis: {
            title: {
              text: yField
            }
          },
          plotOptions: {
            column: {
              colorByPoint: true
            }
          },
          series: [{
            name: yField,
            data: limitedSeriesData
          }]
        };
        
      case 'scatter':
        return {
          ...commonOptions,
          chart: {
            ...commonOptions.chart,
            type: 'scatter'
          },
          xAxis: {
            title: {
              text: xField
            }
          },
          yAxis: {
            title: {
              text: yField
            }
          },
          series: [{
            name: `${xField} vs ${yField}`,
            data: limitedCategories.map((name, i) => [i, limitedSeriesData[i]])
          }]
        };

      case 'bubble':
        return {
          ...commonOptions,
          chart: {
            ...commonOptions.chart,
            type: 'bubble'
          },
          xAxis: {
            title: {
              text: xField
            }
          },
          yAxis: {
            title: {
              text: yField
            }
          },
          series: [{
            name: `${xField} vs ${yField}`,
            data: limitedCategories.map((name, i) => {
              const size = Math.max(5, Math.min(30, limitedSeriesData[i] / 10));
              return [i, limitedSeriesData[i], size];
            })
          }]
        };
        
      case 'area':
        return {
          ...commonOptions,
          chart: {
            ...commonOptions.chart,
            type: 'area'
          },
          xAxis: {
            categories: limitedCategories,
            title: {
              text: xField
            }
          },
          yAxis: {
            title: {
              text: yField
            }
          },
          plotOptions: {
            area: {
              marker: {
                enabled: false
              }
            }
          },
          series: [{
            name: yField,
            data: limitedSeriesData
          }]
        };
      
      case 'donut':
        return {
          ...commonOptions,
          chart: {
            ...commonOptions.chart,
            type: 'pie'
          },
          plotOptions: {
            pie: {
              innerSize: '60%',
              allowPointSelect: true,
              cursor: 'pointer',
              dataLabels: {
                enabled: true,
                format: '<b>{point.name}</b>: {point.percentage:.1f}%'
              }
            }
          },
          series: [{
            name: yField,
            colorByPoint: true,
            data: limitedCategories.map((name, i) => ({
              name: name,
              y: limitedSeriesData[i]
            }))
          }]
        };
        
      case 'stacked':
        let stackedSeries = [{
          name: yField,
          data: limitedSeriesData
        }];
        
        const stackColumn = availableColumns.find(col => 
          col !== xField && col !== yField && typeof chartData[0][col] !== 'number'
        );
        
        if (stackColumn) {
          const groupedData: Record<string, number[]> = {};
          
          chartData.forEach((item, idx) => {
            if (idx >= MAX_DATA_POINTS) return;
            
            const stackValue = String(item[stackColumn] || 'Other');
            if (!groupedData[stackValue]) {
              groupedData[stackValue] = new Array(limitedCategories.length).fill(0);
            }
            groupedData[stackValue][idx] = Number(item[yField]) || 0;
          });
          
          stackedSeries = Object.keys(groupedData).map(key => ({
            name: key,
            data: groupedData[key]
          }));
        }
        
        return {
          ...commonOptions,
          chart: {
            ...commonOptions.chart,
            type: 'column'
          },
          xAxis: {
            categories: limitedCategories,
            title: {
              text: xField
            }
          },
          yAxis: {
            title: {
              text: yField
            },
            stackLabels: {
              enabled: true,
              style: {
                fontWeight: 'bold',
                color: '#AAA'
              }
            }
          },
          plotOptions: {
            column: {
              stacking: 'normal',
              dataLabels: {
                enabled: false
              }
            }
          },
          series: stackedSeries
        };
        
      case 'polar':
        return {
          ...commonOptions,
          chart: {
            ...commonOptions.chart,
            polar: true,
            type: 'line'
          },
          xAxis: {
            categories: limitedCategories,
            tickmarkPlacement: 'on',
            lineWidth: 0
          },
          yAxis: {
            gridLineInterpolation: 'polygon',
            lineWidth: 0,
            min: 0
          },
          series: [{
            name: yField,
            data: limitedSeriesData,
            pointPlacement: 'on'
          }]
        };
        
      case 'gauge':
        const maxValue = Math.max(...limitedSeriesData);
        const avgValue = limitedSeriesData.reduce((a, b) => a + b, 0) / limitedSeriesData.length;
        
        return {
          ...commonOptions,
          chart: {
            ...commonOptions.chart,
            type: 'gauge'
          },
          pane: {
            startAngle: -150,
            endAngle: 150
          },
          yAxis: {
            min: 0,
            max: maxValue * 1.2,
            title: {
              text: yField
            },
            stops: [
              [0.1, '#55BF3B'],
              [0.5, '#DDDF0D'],
              [0.9, '#DF5353']
            ],
            minorTickInterval: 'auto',
            minorTickWidth: 1,
            minorTickLength: 10,
            minorTickPosition: 'inside',
            tickWidth: 2,
            tickPosition: 'inside',
            tickLength: 10,
            labels: {
              step: 2
            }
          },
          series: [{
            name: yField,
            data: [avgValue],
            dataLabels: {
              format: '{y}'
            }
          }]
        };
        
      case 'heatmap': {
        const uniqueXValues = [...new Set(limitedCategories)];
        const uniqueYValues = [...new Set(chartData.map(item => item[yField]))].slice(0, 20);
        
        const heatmapData = [];
        for (let i = 0; i < Math.min(uniqueXValues.length, 20); i++) {
          for (let j = 0; j < Math.min(uniqueYValues.length, 20); j++) {
            const matchingItems = chartData.filter(
              item => String(item[xField]) === uniqueXValues[i] && 
                      String(item[yField]) === String(uniqueYValues[j])
            );
            
            const value = matchingItems.length > 0 ? 
              matchingItems.reduce((sum, item) => sum + (Number(item[yField]) || 0), 0) / matchingItems.length : 
              Math.random() * 10;
            
            heatmapData.push([i, j, value]);
          }
        }
        
        return {
          ...commonOptions,
          chart: {
            ...commonOptions.chart,
            type: 'heatmap'
          },
          xAxis: {
            categories: uniqueXValues.slice(0, 20)
          },
          yAxis: {
            categories: uniqueYValues.slice(0, 20)
          },
          colorAxis: {
            min: 0,
            minColor: '#EEEEFF',
            maxColor: '#7E69AB'
          },
          series: [{
            name: 'Values',
            data: heatmapData,
            dataLabels: {
              enabled: true,
              color: '#000000'
            }
          }]
        };
      }
        
      case 'treemap':
        return {
          ...commonOptions,
          chart: {
            ...commonOptions.chart,
            type: 'treemap'
          },
          series: [{
            name: yField,
            layoutAlgorithm: 'squarified',
            data: limitedCategories.map((name, i) => ({
              name: String(name).length > 20 ? String(name).substring(0, 20) + '...' : name,
              value: limitedSeriesData[i],
              colorValue: limitedSeriesData[i]
            }))
          }]
        };
        
      case 'waterfall':
        return {
          ...commonOptions,
          chart: {
            ...commonOptions.chart,
            type: 'waterfall'
          },
          xAxis: {
            categories: limitedCategories,
            title: {
              text: xField
            }
          },
          yAxis: {
            title: {
              text: yField
            }
          },
          series: [{
            name: yField,
            data: limitedCategories.map((name, i) => ({
              name: name,
              y: limitedSeriesData[i]
            }))
          }]
        };
        
      case 'funnel':
        return {
          ...commonOptions,
          chart: {
            ...commonOptions.chart,
            type: 'funnel'
          },
          plotOptions: {
            funnel: {
              neckWidth: '30%',
              neckHeight: '25%',
              dataLabels: {
                enabled: true,
                format: '<b>{point.name}</b>: {point.y}'
              }
            }
          },
          series: [{
            name: yField,
            data: limitedCategories.map((name, i) => ({
              name: String(name).length > 20 ? String(name).substring(0, 20) + '...' : name,
              y: limitedSeriesData[i]
            }))
          }]
        };
        
      case 'sankey': {
        const links = [];
        const nodeSet = new Set();
        
        const MAX_SANKEY_ITEMS = 30;
        const sankeySample = chartData.slice(0, MAX_SANKEY_ITEMS);
        
        sankeySample.forEach(item => {
          const source = String(item[xField]) || 'Unknown';
          const target = yField && item[yField] ? String(item[yField]) : 'Unknown Value';
          const weight = 1;
          
          nodeSet.add(source);
          nodeSet.add(target);
          
          links.push({
            from: source,
            to: target,
            weight: weight
          });
        });
        
        return {
          ...commonOptions,
          chart: {
            ...commonOptions.chart,
          },
          title: {
            text: `Relationship between ${xField} and ${yField}`
          },
          series: [{
            type: 'sankey',
            name: 'Flow',
            data: links
          }]
        };
      }
        
      default:
        return {
          ...commonOptions,
          chart: {
            ...commonOptions.chart,
            type: 'column'
          },
          xAxis: {
            categories: limitedCategories
          },
          yAxis: {
            title: {
              text: yField
            }
          },
          series: [{
            name: yField,
            data: limitedSeriesData
          }]
        };
    }
  };
  
  const handleRetry = () => {
    setError(null);
    setLoadAttempts(0);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center ${heightClass}`}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-2" />
          <p className="text-sm text-muted-foreground">Loading visualization...</p>
        </div>
      </div>
    );
  }

  if (error || !chartData || chartData.length === 0) {
    return (
      <div className={`flex items-center justify-center ${heightClass}`}>
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 mx-auto text-red-400 mb-2" />
          <p className="text-red-400 mb-2">No data available for visualization</p>
          <p className="text-sm text-muted-foreground mb-4">
            {error || 'Unable to generate chart from the dataset'}
          </p>
          <Button variant="outline" onClick={handleRetry} className="mr-2">
            Retry Loading Data
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              setError(null);
              setLoadAttempts(0);
              toast({
                title: 'Debug Mode',
                description: 'Chart component is using direct access: ' + useDirectAccess,
              });
            }}
          >
            <RefreshCcw className="h-4 w-4 mr-2" /> 
            Force Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-purple-500/20">
      <div className={`w-full ${heightClass} p-4`}>
        <HighchartsReact
          highcharts={Highcharts}
          options={getHighchartsOptions()}
          immutable={false}
          containerProps={{ style: { height: '100%', width: '100%' } }}
        />
      </div>
    </Card>
  );
};

export default ChartVisualization;
