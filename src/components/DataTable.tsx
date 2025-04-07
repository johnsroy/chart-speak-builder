
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { generateChartColors } from '@/utils/chartUtils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface DataTableProps {
  data: any[] | null;
  loading: boolean;
  error: string | null;
  title?: string;
  pageSize?: number;
}

const DataTable: React.FC<DataTableProps> = ({ 
  data, 
  loading, 
  error,
  title = 'Dataset Preview',
  pageSize = 10
}) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  
  // Handle pagination
  const totalPages = data && data.length > 0 ? Math.ceil(data.length / pageSize) : 0;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, data?.length || 0);
  const currentData = data?.slice(startIndex, endIndex) || [];
  
  const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
  const columnColors = React.useMemo(() => 
    generateChartColors(columns.length, 'gradient'), [columns.length]);
  
  // Generate fallback data if no data is provided
  const generateFallbackData = () => {
    const fallbackData = [];
    for (let i = 0; i < 5; i++) {
      fallbackData.push({
        id: i + 1,
        name: `Sample Item ${i + 1}`,
        value: Math.floor(Math.random() * 100),
        category: ['A', 'B', 'C'][i % 3]
      });
    }
    return fallbackData;
  };

  if (loading) {
    return (
      <Card className="w-full overflow-hidden bg-background/50 backdrop-blur-sm border-purple-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-2">
            <div className="flex space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-6 w-24" />
              ))}
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // No data scenario - generate fallback if error or empty data
  if (error || !data || data.length === 0) {
    const fallbackData = generateFallbackData();
    const fallbackColumns = Object.keys(fallbackData[0]);
    
    return (
      <Card className="w-full overflow-hidden bg-background/50 backdrop-blur-sm border-purple-500/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{title}</CardTitle>
            <Badge variant="outline" className="bg-red-500/20 text-red-200 border-red-500/40">
              Using Sample Data
            </Badge>
          </div>
        </CardHeader>
        <ScrollArea className="h-[500px]">
          <CardContent>
            <div className="text-center py-4">
              <p className="text-red-400 mb-2">
                {error || 'Unable to load dataset preview'}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Showing sample data instead
              </p>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {fallbackColumns.map((column, index) => (
                      <TableHead 
                        key={column}
                        style={{ borderBottom: `2px solid ${columnColors[index % columnColors.length]}` }}
                      >
                        {column}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fallbackData.map((row, rowIndex) => (
                    <TableRow 
                      key={rowIndex} 
                      className={rowIndex % 2 === 0 ? 'bg-gray-900/30' : 'bg-gray-800/20'}
                    >
                      {fallbackColumns.map((column) => (
                        <TableCell key={`${rowIndex}-${column}`}>
                          {typeof row[column] === 'object' 
                            ? JSON.stringify(row[column]) 
                            : String(row[column])}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex items-center justify-center mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Retry Loading Data
              </Button>
            </div>
          </CardContent>
        </ScrollArea>
      </Card>
    );
  }
  
  return (
    <Card className="w-full overflow-hidden bg-background/50 backdrop-blur-sm border-purple-500/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Badge variant="outline" className="bg-purple-500/20 text-purple-200">
            {data.length} rows
          </Badge>
        </div>
      </CardHeader>
      <ScrollArea className="h-[500px]">
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column, index) => (
                    <TableHead 
                      key={column}
                      className="text-gray-300 font-medium"
                      style={{ borderBottom: `2px solid ${columnColors[index]}` }}
                    >
                      {column}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.map((row, rowIndex) => (
                  <TableRow 
                    key={rowIndex} 
                    className={rowIndex % 2 === 0 ? 'bg-gray-900/30' : 'bg-gray-800/20'}
                  >
                    {columns.map((column) => (
                      <TableCell 
                        key={`${rowIndex}-${column}`} 
                        className="border-b border-gray-800/50"
                      >
                        {typeof row[column] === 'object' 
                          ? JSON.stringify(row[column]) 
                          : String(row[column])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-400">
                Showing rows {startIndex + 1} to {endIndex} of {data.length}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-gray-300">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline" 
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
};

export default DataTable;
