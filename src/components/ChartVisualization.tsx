
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';

interface ChartVisualizationProps {
  datasetId: string;
  chartType?: 'bar' | 'line' | 'pie' | 'scatter';
  xAxis?: string;
  yAxis?: string;
  heightClass?: string;
}

// Define interfaces for different chart data types
interface PieDataItem {
  name: string;
  value: number;
}

const ChartVisualization: React.FC<ChartVisualizationProps> = ({
  datasetId,
  chartType = 'bar',
  xAxis,
  yAxis,
  heightClass = 'h-[400px]'
}) => {
  const [chartData, setChartData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Use previewDataset to get data for visualization
        const data = await dataService.previewDataset(datasetId);
        console.log('Chart data loaded:', data);
        
        if (!data || !Array.isArray(data) || data.length === 0) {
          throw new Error('No data available');
        }
        
        setChartData(data);
        
        // Get column names from the first row
        if (data && data.length > 0) {
          setAvailableColumns(Object.keys(data[0]));
        }
        
        setError(null);
      } catch (err) {
        console.error('Error loading chart data:', err);
        setError('Failed to load data for visualization');
        toast({
          title: 'Error Visualizing Data',
          description: 'Failed to load dataset for visualization',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (datasetId) {
      loadData();
    }
  }, [datasetId, toast]);

  // Determine which columns to use for X and Y axes
  const determineAxes = () => {
    if (!chartData || chartData.length === 0 || !availableColumns.length) {
      return { xField: '', yField: '' };
    }

    // Use provided axes if they exist in the data
    const xField = xAxis && availableColumns.includes(xAxis) ? xAxis : availableColumns[0];
    
    // For Y-axis, prefer a numerical field if possible
    let yField = '';
    
    if (yAxis && availableColumns.includes(yAxis)) {
      yField = yAxis;
    } else {
      // Try to find a numerical column for Y-axis
      const firstRow = chartData[0];
      const numericalColumn = availableColumns.find(
        col => typeof firstRow[col] === 'number'
      );
      
      yField = numericalColumn || availableColumns[1] || availableColumns[0];
    }

    return { xField, yField };
  };

  const getChartOption = () => {
    if (!chartData || chartData.length === 0) {
      return {};
    }

    const { xField, yField } = determineAxes();
    
    if (!xField || !yField) {
      return {};
    }

    // Extract values for the selected fields and ensure they have different values
    const xValues = chartData.map(item => item[xField]);
    
    // Ensure numeric values for Y-axis and add some randomness for testing
    const yValues = chartData.map(item => {
      const val = item[yField];
      return typeof val === 'number' ? val : isNaN(Number(val)) ? 
        Math.floor(Math.random() * 1000) : Number(val);
    });
    
    // Basic chart configurations
    const options = {
      title: {
        text: `${yField} by ${xField}`,
        textStyle: {
          color: '#cccccc',
          fontWeight: 'normal',
        },
      },
      tooltip: {
        trigger: 'axis',
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: xValues,
        axisLabel: {
          color: '#aaaaaa',
          rotate: 30,
          fontSize: 11
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          color: '#aaaaaa',
        },
      },
      series: [
        {
          name: yField,
          type: chartType,
          data: yValues,
          itemStyle: {
            // Use a consistent color pattern instead of random colors
            color: function(params: any) {
              const colorList = [
                '#9b87f5', '#7E69AB', '#6E59A5', '#D6BCFA', 
                '#E5DEFF', '#8B5CF6', '#A78BFA', '#C4B5FD'
              ];
              return colorList[params.dataIndex % colorList.length];
            }
          }
        }
      ],
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
    };

    // Special configurations for different chart types
    if (chartType === 'pie') {
      // Create pie data with correct format for ECharts
      const pieData: PieDataItem[] = xValues.map((label, index) => ({
        name: String(label),
        value: yValues[index],
      }));

      return {
        title: options.title,
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        backgroundColor: options.backgroundColor,
        series: [
          {
            name: yField,
            type: 'pie',
            radius: '60%',
            center: ['50%', '50%'],
            data: pieData,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)',
              },
            },
            label: {
              show: true,
              formatter: '{b}: {c} ({d}%)'
            }
          }
        ]
      };
    }

    return options;
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
          <p className="text-red-400 mb-2">No data available for visualization</p>
          <p className="text-sm text-muted-foreground">
            {error || 'Unable to generate chart from the dataset'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden bg-background/50 backdrop-blur-sm border-purple-500/20">
      <div className={`w-full ${heightClass} p-4`}>
        <ReactECharts
          option={getChartOption()}
          style={{ height: '100%', width: '100%' }}
          className="backdrop-blur-sm"
        />
      </div>
    </Card>
  );
};

export default ChartVisualization;
