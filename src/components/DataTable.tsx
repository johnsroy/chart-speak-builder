import React, { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';
import { Dataset } from '@/services/types/datasetTypes';
import { dataService } from '@/services/dataService';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { formatFileSize } from '@/services/utils/fileUtils';
import { datasetUtils } from '@/utils/datasetUtils';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export interface DataTableProps {
  dataset?: Dataset | null;
  datasetId?: string;
  data?: any[];
  loading?: boolean; 
  error?: string | null;
  title?: string;
  pageSize?: number;
  onRefresh?: () => Promise<void>;
}

export const DataTable: React.FC<DataTableProps> = ({ 
  dataset, 
  datasetId,
  data: externalData,
  loading: externalLoading,
  error: externalError,
  title,
  pageSize = 10,
  onRefresh
}) => {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowsPerPage] = useState(pageSize);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  
  useEffect(() => {
    if (externalData) {
      setData(externalData);
      setColumns(externalData.length > 0 ? Object.keys(externalData[0]) : []);
      setIsLoading(false);
      setError(null);
      return;
    }

    const loadData = async () => {
      setIsLoading(externalLoading !== undefined ? externalLoading : true);
      setError(externalError !== undefined ? externalError : null);
      
      if (externalLoading !== undefined) {
        return;
      }
      
      try {
        const id = datasetId || dataset?.id;
        
        if (!id) {
          setError('No dataset ID provided');
          setIsLoading(false);
          return;
        }
        
        console.log(`Loading data for dataset: ${id}`);
        
        try {
          const datasetRows = await datasetUtils.loadDatasetContent(id, {
            showToasts: false,
            limitRows: 1000
          });
          
          if (datasetRows && Array.isArray(datasetRows) && datasetRows.length > 0) {
            console.log(`Successfully loaded ${datasetRows.length} rows using datasetUtils`);
            setData(datasetRows);
            setColumns(Object.keys(datasetRows[0] || {}));
            setIsLoading(false);
            setError(null);
            return;
          } else {
            console.log("datasetUtils returned empty or invalid data");
          }
        } catch (datasetUtilsError) {
          console.warn("Error using datasetUtils:", datasetUtilsError);
        }
        
        let previewDataFound = false;
        
        if (dataset && dataset.preview_data) {
          try {
            const previewData = dataset.preview_data;
            if (Array.isArray(previewData) && previewData.length > 0) {
              setData(previewData);
              setColumns(Object.keys(previewData[0] || {}));
              previewDataFound = true;
              console.log("Using provided preview data from dataset object");
              return;
            }
          } catch (err) {
            console.warn("Failed to use provided preview data:", err);
          }
        }
        
        if (!previewDataFound) {
          console.log("No preview data found, loading from API...");
          const result = await dataService.previewDataset(id);
          
          if (result && Array.isArray(result)) {
            console.log(`Loaded ${result.length} rows from API`);
            setData(result);
            setColumns(result[0] ? Object.keys(result[0]) : []);
            return;
          } else {
            throw new Error('Invalid data format received');
          }
        }
      } catch (err) {
        console.error("Error loading dataset data:", err);
        setError(`Error loading data: ${err instanceof Error ? err.message : String(err)}`);
        
        try {
          const lastUploadedId = sessionStorage.getItem('last_uploaded_dataset');
          
          if (lastUploadedId) {
            const possibleKeys = [
              `preview_${lastUploadedId}`,
              `upload_preview_${lastUploadedId}`,
            ];
            
            let recoveredData = null;
            
            for (const key of possibleKeys) {
              const previewDataStr = sessionStorage.getItem(key);
              if (previewDataStr) {
                try {
                  const previewData = JSON.parse(previewDataStr);
                  if (Array.isArray(previewData) && previewData.length > 0) {
                    recoveredData = previewData;
                    break;
                  }
                } catch (parseErr) {
                  console.warn(`Failed to parse preview data for key ${key}:`, parseErr);
                }
              }
            }
            
            if (recoveredData) {
              setData(recoveredData);
              setColumns(Object.keys(recoveredData[0] || {}));
              setError(null);
              console.log("Recovered using preview data from session storage");
              return;
            }
          }
        } catch (recoveryErr) {
          console.error("Recovery attempt failed:", recoveryErr);
        }
        
        if (retryCount < maxRetries) {
          console.log(`Retrying data load (${retryCount + 1}/${maxRetries})...`);
          setRetryCount(prev => prev + 1);
          setTimeout(() => loadData(), 1000 * (retryCount + 1));
          return;
        }
        
        if (dataset) {
          console.log("Generating sample data based on schema");
          const sampleData = generateSampleDataFromSchema(dataset);
          setData(sampleData);
          setColumns(Object.keys(sampleData[0] || {}));
          setError("Using sample data because the actual dataset could not be loaded.");
          toast.warning("Using sample data", {
            description: "The actual dataset could not be loaded"
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [datasetId, dataset, externalData, externalLoading, externalError, retryCount]);
  
  const generateSampleDataFromSchema = (dataset: Dataset) => {
    const sampleRows = [];
    const rowCount = 20;
    
    const schema = dataset?.column_schema || {};
    const columns = Object.keys(schema);
    
    if (columns.length > 0) {
      for (let i = 0; i < rowCount; i++) {
        const row: Record<string, any> = {};
        columns.forEach(col => {
          const type = schema[col];
          if (type === 'number') {
            row[col] = Math.floor(Math.random() * 1000);
          } else if (type === 'boolean') {
            row[col] = Math.random() > 0.5;
          } else if (type === 'date') {
            const date = new Date();
            date.setDate(date.getDate() - Math.floor(Math.random() * 365));
            row[col] = date.toISOString().split('T')[0];
          } else {
            row[col] = `Sample ${col} ${i + 1}`;
          }
        });
        sampleRows.push(row);
      }
    } else {
      const fileName = dataset?.file_name || 'dataset';
      
      if (fileName.toLowerCase().includes('sales')) {
        for (let i = 0; i < rowCount; i++) {
          sampleRows.push({
            id: i + 1,
            product: `Product ${i % 10 + 1}`,
            quantity: Math.floor(Math.random() * 100),
            price: Math.floor(Math.random() * 1000),
            date: new Date(2025, i % 12, i % 28 + 1).toISOString().split('T')[0]
          });
        }
      } else if (fileName.toLowerCase().includes('customer')) {
        for (let i = 0; i < rowCount; i++) {
          sampleRows.push({
            id: i + 1,
            name: `Customer ${i + 1}`,
            email: `customer${i}@example.com`,
            city: ['New York', 'London', 'Tokyo', 'Paris', 'Berlin'][i % 5],
            age: 20 + Math.floor(Math.random() * 50)
          });
        }
      } else {
        for (let i = 0; i < rowCount; i++) {
          sampleRows.push({
            id: i + 1,
            name: `Item ${i + 1}`,
            value: Math.floor(Math.random() * 1000),
            category: ['A', 'B', 'C', 'D', 'E'][i % 5],
            active: i % 2 === 0
          });
        }
      }
    }
    
    return sampleRows;
  };
  
  const filteredData = data.filter(row => {
    if (!searchTerm) return true;
    return Object.values(row).some(value => 
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
  
  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );
  
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  
  const renderPagination = () => {
    return (
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">
          Showing {Math.min(filteredData.length, 1 + (currentPage - 1) * rowsPerPage)}-
          {Math.min(currentPage * rowsPerPage, filteredData.length)} of {filteredData.length} rows
        </div>
        <Pagination>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <div className="flex items-center mx-2 gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <Button
                  key={i}
                  variant={pageNum === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            {totalPages > 5 && <span className="mx-1">...</span>}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
          >
            Next
          </Button>
        </Pagination>
      </div>
    );
  };
  
  const handleRefresh = async () => {
    setRetryCount(0);
    
    if (onRefresh) {
      await onRefresh();
    } else if (datasetId) {
      setIsLoading(true);
      setError(null);
      try {
        try {
          const datasetRows = await datasetUtils.loadDatasetContent(datasetId, {
            showToasts: false,
            forceRefresh: true,
            limitRows: 1000
          });
          
          if (datasetRows && Array.isArray(datasetRows) && datasetRows.length > 0) {
            console.log(`Successfully loaded ${datasetRows.length} rows using datasetUtils`);
            setData(datasetRows);
            setColumns(Object.keys(datasetRows[0] || {}));
            setIsLoading(false);
            setError(null);
            toast.success("Data refreshed successfully");
            return;
          }
        } catch (datasetUtilsError) {
          console.warn("Error using datasetUtils during refresh:", datasetUtilsError);
        }
        
        const refreshedData = await dataService.previewDataset(datasetId);
        if (refreshedData && Array.isArray(refreshedData)) {
          setData(refreshedData);
          setColumns(refreshedData[0] ? Object.keys(refreshedData[0]) : []);
          toast.success("Data refreshed successfully");
        } else {
          throw new Error("No data returned from refresh");
        }
      } catch (err) {
        setError(`Error refreshing data: ${err instanceof Error ? err.message : String(err)}`);
        toast.error("Failed to refresh data");
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col gap-y-2">
          <CardTitle>{title || (dataset && 'Dataset Explorer') || 'Data Table'}</CardTitle>
          {dataset && (
            <CardDescription>
              {dataset.name || 'Unnamed Dataset'} ({dataset.file_name || 'Unknown File'})
              {dataset.file_size && <span className="ml-2">Size: {formatFileSize(dataset.file_size)}</span>}
            </CardDescription>
          )}
          <div className="flex justify-between items-center mt-2">
            <Input
              placeholder="Search data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                className="flex items-center gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh
              </Button>
              <div className="text-sm text-muted-foreground">
                Total rows: {filteredData.length}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center">
            <div className="animate-spin h-8 w-8 border-t-2 border-primary rounded-full mx-auto mb-3"></div>
            <div>Loading data...</div>
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-3" />
            <div className="text-red-500 mb-2">{error}</div>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              Retry
            </Button>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="py-8 text-center">
            {searchTerm ? 'No matching results' : 'No data available'}
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column}>{column}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((row, idx) => (
                  <TableRow key={idx}>
                    {columns.map((column) => (
                      <TableCell key={column}>
                        {typeof row[column] === 'object' && row[column] !== null
                          ? JSON.stringify(row[column])
                          : String(row[column] ?? '')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {!isLoading && !error && filteredData.length > 0 && renderPagination()}
      </CardContent>
    </Card>
  );
};

export default DataTable;
