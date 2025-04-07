
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, AlertTriangle, RefreshCcw } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import { dataService } from '@/services/dataService';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface ChartVisualizationProps {
  datasetId: string;
  chartType?: 'bar' | 'line' | 'pie' | 'scatter';
  xAxis?: string;
  yAxis?: string;
  heightClass?: string;
  data?: any[];
  useDirectAccess?: boolean;
}

interface PieDataItem {
  name: string;
  value: number;
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
  
  // Add retries tracking
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
        
        // Retry loading if we haven't reached max attempts
        if (loadAttempts < maxRetries) {
          console.log(`Retrying data load, attempt ${loadAttempts + 1} of ${maxRetries}`);
          setLoadAttempts(prev => prev + 1);
          
          // Wait before retrying
          setTimeout(() => {
            loadData();
          }, 1000 * (loadAttempts + 1)); // Exponential backoff
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
  
  // Helper function to find the best field for X axis
  const findBestXAxisField = (data: any[], columns: string[]): string => {
    // Priority: date fields > categorical fields > first field
    const firstRow = data[0];
    
    // Look for date-like fields
    const dateField = columns.find(col => {
      const value = firstRow[col];
      return typeof value === 'string' && 
        (value.match(/^\d{4}-\d{2}-\d{2}/) || // ISO date format
         value.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}/)); // MM/DD/YYYY
    });
    
    if (dateField) return dateField;
    
    // Special handling for Electric Vehicle data
    if (columns.includes('Make')) return 'Make';
    if (columns.includes('make')) return 'make';
    if (columns.includes('Model')) return 'Model';
    if (columns.includes('model')) return 'model';
    
    // Look for categorical fields (string fields with repeated values)
    const categoricalFields = columns.filter(col => {
      const values = data.map(row => row[col]);
      const uniqueValues = new Set(values);
      // If it's a string and has fewer unique values than 50% of total rows
      return typeof firstRow[col] === 'string' && 
        uniqueValues.size < data.length * 0.5;
    });
    
    if (categoricalFields.length > 0) return categoricalFields[0];
    
    // Default to first non-numeric field or just first field
    const nonNumericField = columns.find(col => typeof firstRow[col] !== 'number');
    return nonNumericField || columns[0];
  };
  
  // Helper function to find the best field for Y axis
  const findBestYAxisField = (data: any[], columns: string[], xField: string): string => {
    const firstRow = data[0];
    
    // Special handling for Electric Vehicle data
    if (columns.includes('Electric Range')) return 'Electric Range';
    if (columns.includes('Base MSRP')) return 'Base MSRP';
    if (columns.includes('price')) return 'price';
    
    // Look for numeric fields
    const numericFields = columns.filter(col => 
      col !== xField && typeof firstRow[col] === 'number'
    );
    
    // If we have numeric fields, use the first one
    if (numericFields.length > 0) return numericFields[0];
    
    // If no numeric fields, look for any field with number-like strings
    const numberLikeField = columns.find(col => {
      if (col === xField) return false;
      const value = firstRow[col];
      return typeof value === 'string' && !isNaN(Number(value));
    });
    
    if (numberLikeField) return numberLikeField;
    
    // Default to any field that's not the x-axis
    return columns.find(col => col !== xField) || (columns.length > 1 ? columns[1] : columns[0]);
  };

  const getChartOption = () => {
    if (!chartData || chartData.length === 0) {
      console.log("No data available for chart options");
      return {};
    }

    const { xField, yField } = determineAxes();
    
    if (!xField || !yField) {
      console.log("Missing xField or yField for chart options");
      return {};
    }

    console.log(`Generating chart options for ${chartType} chart with X: ${xField}, Y: ${yField}`);

    // Extract x and y values, handling various data types
    const xValues = chartData.map(item => {
      const val = item[xField];
      return val !== undefined && val !== null ? String(val) : 'N/A';
    });
    
    const yValues = chartData.map(item => {
      const val = item[yField];
      // Handle different types of values
      if (val === undefined || val === null) return 0;
      if (typeof val === 'number') return val;
      const numVal = Number(val);
      return !isNaN(numVal) ? numVal : 0;
    });
    
    console.log(`Chart data prepared: ${xValues.length} points`);
    
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

    if (chartType === 'pie') {
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
  
  // Function to retry loading data
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
