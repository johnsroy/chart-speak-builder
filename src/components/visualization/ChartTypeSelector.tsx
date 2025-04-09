
import React from 'react';
import {
  BarChart,
  LineChart,
  PieChart,
  CircleDot, // Replace ScatterPlot with CircleDot
  ArrowUpDown,
  CircleDashed,
  Layers,
  TableIcon,
  AreaChart
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ChartType, getChartTypeName } from '@/utils/chartSuggestionUtils';

interface ChartTypeSelectorProps {
  selectedChartType: ChartType;
  onChartTypeChange: (chartType: ChartType) => void;
  availableChartTypes?: ChartType[];
}

const ChartTypeSelector = ({
  selectedChartType,
  onChartTypeChange,
  availableChartTypes = ['bar', 'line', 'pie', 'scatter', 'area', 'column', 'donut', 'stacked', 'table']
}: ChartTypeSelectorProps) => {
  
  const getChartIcon = (chartType: ChartType) => {
    switch (chartType) {
      case 'bar': return <BarChart className="h-4 w-4 mr-2" />;
      case 'line': return <LineChart className="h-4 w-4 mr-2" />;
      case 'pie': return <PieChart className="h-4 w-4 mr-2" />;
      case 'scatter': return <CircleDot className="h-4 w-4 mr-2" />;
      case 'area': return <AreaChart className="h-4 w-4 mr-2" />;
      case 'column': return <BarChart className="h-4 w-4 mr-2" style={{ transform: 'rotate(90deg)' }} />;
      case 'donut': return <CircleDashed className="h-4 w-4 mr-2" />;
      case 'stacked': return <Layers className="h-4 w-4 mr-2" />;
      case 'table': return <TableIcon className="h-4 w-4 mr-2" />;
      default: return <BarChart className="h-4 w-4 mr-2" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 bg-white/10">
          {getChartIcon(selectedChartType)}
          {getChartTypeName(selectedChartType)}
          <ArrowUpDown className="h-3 w-3 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 p-2 bg-gray-900/90 backdrop-blur-md border border-purple-500/30 max-h-[60vh] overflow-y-auto"
      >
        {availableChartTypes.map((chartType) => (
          <DropdownMenuItem
            key={chartType}
            onClick={() => onChartTypeChange(chartType)} 
            className={`flex items-center hover:bg-purple-500/20 ${
              chartType === selectedChartType ? 'bg-purple-500/30' : ''
            }`}
          >
            {getChartIcon(chartType)}
            {getChartTypeName(chartType)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ChartTypeSelector;
