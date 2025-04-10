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
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { parseCSV } from '@/services/utils/fileUtils';
import { supabase } from '@/lib/supabase';

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
  const [loadingMessage, setLoadingMessage] = useState("Loading data...");
  const maxRetries = 5;
  
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
      
      const id = datasetId || dataset?.id;
      
      if (!id) {
        setError('No dataset ID provided');
        setIsLoading(false);
        return;
      }

      console.log(`Loading data for dataset: ${id}`);
      setLoadingMessage(`Fetching dataset ${id}...`);
      
      try {
        // First, get the dataset metadata to check storage path
        const { data: datasetInfo, error: datasetError } = await supabase
          .from('datasets')
          .select('*')
          .eq('id', id)
          .single();
          
        if (datasetError) {
          console.error("Error fetching dataset metadata:", datasetError);
          throw new Error(`Could not fetch dataset metadata: ${datasetError.message}`);
        }
        
        if (!datasetInfo) {
          throw new Error("Dataset not found");
        }
        
        console.log("Dataset metadata:", datasetInfo);
        
        // Try multiple approaches to load the data
        
        // Approach 1: Try datasetUtils
        try {
          setLoadingMessage("Loading dataset content...");
          const datasetRows = await datasetUtils.loadDatasetContent(id, {
            showToasts: false,
            limitRows: 5000
          });
          
          if (datasetRows && Array.isArray(datasetRows) && datasetRows.length > 0) {
            console.log(`Successfully loaded ${datasetRows.length} rows using datasetUtils`);
            setData(datasetRows);
            setColumns(Object.keys(datasetRows[0] || {}));
            
            // Update dataset column schema if it's missing or empty
            if ((!datasetInfo.column_schema || Object.keys(datasetInfo.column_schema).length === 0) && datasetRows.length > 0) {
              try {
                const sampleRow = datasetRows[0];
                const schema: Record<string, string> = {};
                Object.entries(sampleRow).forEach(([key, value]) => {
                  schema[key] = typeof value === 'number' ? 'number' : 
                                typeof value === 'boolean' ? 'boolean' : 'string';
                });
                
                // Update the dataset schema
                await supabase
                  .from('datasets')
                  .update({ 
                    column_schema: schema,
                    row_count: datasetRows.length 
                  })
                  .eq('id', id);
                  
                console.log("Updated dataset schema and row count");
              } catch (updateErr) {
                console.warn("Failed to update dataset schema:", updateErr);
              }
            }
            
            setIsLoading(false);
            setError(null);
            return;
          }
        } catch (utilsErr) {
          console.warn("Error using datasetUtils:", utilsErr);
        }
        
        // Approach 2: Direct storage access
        if (datasetInfo && datasetInfo.storage_path) {
          try {
            setLoadingMessage("Accessing file from storage...");
            const { data: fileData, error: storageError } = await supabase
              .storage
              .from(datasetInfo.storage_type || 'supabase')
              .download(datasetInfo.storage_path);
              
            if (storageError) {
              console.error("Storage access error:", storageError);
              throw new Error(`Could not access storage: ${storageError.message}`);
            }
            
            if (fileData) {
              const text = await fileData.text();
              const parsedData = await parseCSV(text, 5000);
              
              if (parsedData && parsedData.length > 0) {
                console.log(`Successfully parsed ${parsedData.length} rows from storage file`);
                setData(parsedData);
                setColumns(Object.keys(parsedData[0] || {}));
                
                // Update dataset schema and row count
                try {
                  const sampleRow = parsedData[0];
                  const schema: Record<string, string> = {};
                  Object.entries(sampleRow).forEach(([key, value]) => {
                    schema[key] = typeof value === 'number' ? 'number' : 
                                  typeof value === 'boolean' ? 'boolean' : 'string';
                  });
                  
                  // Update the dataset schema and row count
                  await supabase
                    .from('datasets')
                    .update({ 
                      column_schema: schema,
                      row_count: parsedData.length 
                    })
                    .eq('id', id);
                    
                  console.log("Updated dataset schema and row count from parsed data");
                } catch (updateErr) {
                  console.warn("Failed to update dataset schema from parsed data:", updateErr);
                }
                
                setIsLoading(false);
                setError(null);
                return;
              }
            }
          } catch (storageErr) {
            console.warn("Error accessing storage:", storageErr);
          }
        }
        
        // Approach 3: Preview data
        if (datasetInfo && datasetInfo.preview_key) {
          try {
            setLoadingMessage("Loading preview data...");
            const previewData = sessionStorage.getItem(datasetInfo.preview_key);
            if (previewData) {
              const parsed = JSON.parse(previewData);
              if (Array.isArray(parsed) && parsed.length > 0) {
                console.log(`Found ${parsed.length} rows using preview_key: ${datasetInfo.preview_key}`);
                setData(parsed);
                setColumns(Object.keys(parsed[0] || {}));
                
                // Also store in session storage for dataset_id key
                try {
                  sessionStorage.setItem(`dataset_${id}`, previewData);
                } catch (e) {
                  console.warn("Could not cache dataset:", e);
                }
                
                setIsLoading(false);
                setError(null);
                return;
              }
            }
          } catch (previewErr) {
            console.warn("Error loading preview data:", previewErr);
          }
        }
        
        // Fall back to API
        setLoadingMessage("Fetching from API...");
        const result = await dataService.previewDataset(id);
        
        if (result && Array.isArray(result) && result.length > 0) {
          console.log(`Loaded ${result.length} rows from API`);
          setData(result);
          setColumns(Object.keys(result[0] || {}));
          setIsLoading(false);
          setError(null);
          return;
        } else {
          throw new Error("Empty or invalid data from API");
        }
      } catch (err) {
        console.error("Error loading dataset data:", err);
        
        if (retryCount < maxRetries) {
          // Exponential backoff for retries
          const delay = Math.min(1000 * Math.pow(1.5, retryCount), 10000);
          console.log(`Retrying data load in ${delay}ms (${retryCount + 1}/${maxRetries})...`);
          setLoadingMessage(`Retrying data load (${retryCount + 1}/${maxRetries})...`);
          
          setRetryCount(prev => prev + 1);
          setTimeout(() => loadData(), delay);
          return;
        }
        
        setError(`Error loading data: ${err instanceof Error ? err.message : String(err)}`);
        setIsLoading(false);
        
        // Generate fallback data if we couldn't load real data
        if (dataset) {
          console.log("Generating fallback data");
          const sampleData = generateSampleDataFromSchema(dataset);
          if (sampleData.length > 0) {
            setData(sampleData);
            setColumns(Object.keys(sampleData[0]));
            toast.warning("Using sample data", {
              description: "Could not load the actual dataset"
            });
          }
        }
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
      
      if (fileName.toLowerCase().includes('electric') || fileName.toLowerCase().includes('vehicle')) {
        for (let i = 0; i < rowCount; i++) {
          sampleRows.push({
            'VIN': `EV${1000 + i}`,
            'County': ['King', 'Pierce', 'Snohomish', 'Thurston', 'Clark'][i % 5],
            'City': ['Seattle', 'Tacoma', 'Bellevue', 'Olympia', 'Vancouver'][i % 5],
            'State': 'WA',
            'Postal Code': 98000 + (i * 10),
            'Model Year': 2018 + (i % 5),
            'Make': ['Tesla', 'Nissan', 'Chevrolet', 'Ford', 'Toyota'][i % 5],
            'Model': ['Model 3', 'Leaf', 'Bolt', 'Mustang Mach-E', 'Prius Prime'][i % 5],
            'Electric Vehicle Type': i % 2 === 0 ? 'Battery Electric Vehicle (BEV)' : 'Plug-in Hybrid Electric Vehicle (PHEV)',
            'Electric Range': 150 + (i * 10),
            'Base MSRP': 35000 + (i * 1000)
          });
        }
      } else if (fileName.toLowerCase().includes('sales')) {
        for (let i = 0; i < rowCount; i++) {
          sampleRows.push({
            id: i + 1,
            product: `Product ${i % 10 + 1}`,
            quantity: Math.floor(Math.random() * 100),
            price: Math.floor(Math.random() * 1000),
            date: new Date(2025, i % 12, i % 28 + 1).toISOString().split('T')[0]
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
    setIsLoading(true);
    setError(null);
    
    try {
      if (onRefresh) {
        await onRefresh();
      } else if (datasetId) {
        try {
          // Clear session storage cache to force fresh data load
          try {
            sessionStorage.removeItem(`dataset_${datasetId}`);
          } catch (e) {
            console.warn("Could not clear dataset cache:", e);
          }
          
          const datasetRows = await datasetUtils.loadDatasetContent(datasetId, {
            showToasts: false,
            forceRefresh: true,
            limitRows: 5000
          });
          
          if (datasetRows && Array.isArray(datasetRows) && datasetRows.length > 0) {
            console.log(`Successfully loaded ${datasetRows.length} rows using datasetUtils`);
            setData(datasetRows);
            setColumns(Object.keys(datasetRows[0] || {}));
            toast.success("Data refreshed successfully");
          } else {
            throw new Error("No data returned from refresh");
          }
        } catch (utilsErr) {
          console.warn("Error using datasetUtils during refresh:", utilsErr);
          const refreshedData = await dataService.previewDataset(datasetId);
          if (refreshedData && Array.isArray(refreshedData)) {
            setData(refreshedData);
            setColumns(refreshedData[0] ? Object.keys(refreshedData[0]) : []);
            toast.success("Data refreshed successfully");
          } else {
            throw new Error("No data returned from refresh");
          }
        }
      }
    } catch (err) {
      setError(`Error refreshing data: ${err instanceof Error ? err.message : String(err)}`);
      toast.error("Failed to refresh data");
    } finally {
      setIsLoading(false);
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
              {dataset.row_count > 0 && <span className="ml-2">Rows: {dataset.row_count.toLocaleString()}</span>}
              {dataset.column_schema && <span className="ml-2">Columns: {Object.keys(dataset.column_schema).length}</span>}
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
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                Refresh
              </Button>
              <div className="text-sm text-muted-foreground">
                {filteredData.length > 0 && `Total rows: ${filteredData.length}`}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center">
            <div className="animate-spin h-8 w-8 border-t-2 border-primary rounded-full mx-auto mb-3"></div>
            <div>{loadingMessage}</div>
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
