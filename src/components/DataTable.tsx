
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { generateChartColors } from '@/utils/chartUtils';

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
  const totalPages = data ? Math.ceil(data.length / pageSize) : 0;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, data?.length || 0);
  const currentData = data?.slice(startIndex, endIndex) || [];
  
  const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
  const columnColors = React.useMemo(() => 
    generateChartColors(columns.length, 'gradient'), [columns.length]);
  
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
  
  if (error || !data || data.length === 0) {
    return (
      <Card className="w-full overflow-hidden bg-background/50 backdrop-blur-sm border-purple-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-400 mb-2">No data available</p>
            <p className="text-sm text-muted-foreground">
              {error || 'Unable to load dataset preview'}
            </p>
          </div>
        </CardContent>
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
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  {columns.map((column, index) => (
                    <th 
                      key={column}
                      className="p-2 text-left text-gray-300 font-medium"
                      style={{ borderBottom: `2px solid ${columnColors[index]}` }}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentData.map((row, rowIndex) => (
                  <tr 
                    key={rowIndex} 
                    className={rowIndex % 2 === 0 ? 'bg-gray-900/30' : 'bg-gray-800/20'}
                  >
                    {columns.map((column) => (
                      <td 
                        key={`${rowIndex}-${column}`} 
                        className="p-2 border-b border-gray-800/50"
                      >
                        {typeof row[column] === 'object' 
                          ? JSON.stringify(row[column]) 
                          : String(row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
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
