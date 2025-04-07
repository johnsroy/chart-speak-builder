import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight, Loader2, RefreshCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { generateChartColors } from '@/utils/chartUtils';
import { toast } from 'sonner';
import { navigate } from 'react-router-dom';
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
  onRefresh?: () => void;
}

const DataTable: React.FC<DataTableProps> = ({ 
  data, 
  loading, 
  error,
  title = 'Dataset Preview',
  pageSize = 10,
  onRefresh
}) => {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);
  
  // Reset to first page when data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [data]);
  
  // Handle pagination
  const totalPages = data && data.length > 0 ? Math.ceil(data.length / pageSize) : 0;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, data?.length || 0);
  const currentData = data?.slice(startIndex, endIndex) || [];
  
  const columns = data && data.length > 0 ? Object.keys(data[0]) : [];
  const columnColors = React.useMemo(() => 
    generateChartColors(columns.length, 'gradient'), [columns.length]);
  
  // Auto-retry when data is empty or on error, up to 3 times
  React.useEffect(() => {
    if (onRefresh && !loading && retryCount < 3 && (
        (!data || data.length === 0) || 
        error
      )) {
      console.log(`Auto-retrying data load (attempt ${retryCount + 1}/3)`);
      const timer = setTimeout(() => {
        setIsRetrying(true);
        onRefresh().finally(() => {
          setIsRetrying(false);
          setRetryCount(prev => prev + 1);
        });
      }, 1000 * (retryCount + 1)); // Exponential backoff
      
      return () => clearTimeout(timer);
    }
  }, [data, error, loading, onRefresh, retryCount]);

  const handleRetry = async () => {
    setIsRetrying(true);
    
    if (onRefresh) {
      try {
        await onRefresh();
        toast.success("Data refreshed successfully");
      } catch (err) {
        toast.error("Failed to refresh data");
      }
    } else {
      // Wait for a moment to simulate refresh
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.info("Refresh handler not provided");
    }
    
    setIsRetrying(false);
  };

  // Loading state
  if (loading || isRetrying) {
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
  
  // Error or empty data state
  if (error || !data || data.length === 0) {
    return (
      <Card className="w-full overflow-hidden bg-background/50 backdrop-blur-sm border-purple-500/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{title}</CardTitle>
            <Badge variant="outline" className="bg-red-500/20 text-red-200 border-red-500/40">
              No Data Available
            </Badge>
          </div>
        </CardHeader>
        <ScrollArea className="h-[500px]">
          <CardContent>
            <div className="text-center py-12">
              <AlertTriangle className="h-16 w-16 mx-auto text-red-400 mb-4" />
              <p className="text-red-400 text-lg mb-2">
                {error || 'No data available to display'}
              </p>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                {error ? 
                  "There was a problem loading the dataset. Please try refreshing or check that the file was uploaded correctly." :
                  "The dataset appears to be empty or could not be loaded. Try refreshing or uploading the file again."}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="bg-violet-900/30 hover:bg-violet-900/50"
                >
                  Reload Page
                </Button>
                
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="bg-purple-900 hover:bg-purple-800"
                >
                  {isRetrying ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Refresh Data
                    </>
                  )}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/upload')}
                >
                  Upload New File
                </Button>
              </div>
            </div>
          </CardContent>
        </ScrollArea>
      </Card>
    );
  }
  
  // Normal data display
  return (
    <Card className="w-full overflow-hidden bg-background/50 backdrop-blur-sm border-purple-500/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost" 
              size="sm"
              onClick={handleRetry}
              disabled={isRetrying}
            >
              {isRetrying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="h-4 w-4" />
              )}
              <span className="sr-only">Refresh</span>
            </Button>
            <Badge variant="outline" className="bg-purple-500/20 text-purple-200">
              {data.length} rows
            </Badge>
          </div>
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
                      style={{ borderBottom: `2px solid ${columnColors[index % columnColors.length]}` }}
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
