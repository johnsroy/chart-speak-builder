
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

interface DataTableProps {
  dataset?: Dataset | null;
  datasetId?: string;
}

export const DataTable: React.FC<DataTableProps> = ({ dataset, datasetId }) => {
  const navigate = useNavigate();
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowsPerPage] = useState(10);
  
  // Get data from dataset
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Try to get data for the dataset
        const id = datasetId || dataset?.id;
        
        if (!id) {
          setError('No dataset ID provided');
          setIsLoading(false);
          return;
        }
        
        // Check if we have preview data in session storage
        let previewDataFound = false;
        
        // Try to get preview data from dataset if available
        if (dataset && dataset.preview_key) {
          try {
            const previewDataStr = sessionStorage.getItem(dataset.preview_key);
            if (previewDataStr) {
              const previewData = JSON.parse(previewDataStr);
              if (Array.isArray(previewData) && previewData.length > 0) {
                setData(previewData);
                setColumns(Object.keys(previewData[0] || {}));
                previewDataFound = true;
                console.log("Loaded preview data from session storage key:", dataset.preview_key);
              }
            }
          } catch (err) {
            console.warn("Failed to load preview data from session storage:", err);
          }
        }
        
        // If no preview data was found, load from the API
        if (!previewDataFound) {
          console.log("No preview data found, loading from API...");
          const result = await dataService.getDatasetData(id);
          
          if (result && Array.isArray(result.data)) {
            console.log(`Loaded ${result.data.length} rows from API`);
            setData(result.data);
            setColumns(result.columns || (result.data[0] ? Object.keys(result.data[0]) : []));
          } else {
            throw new Error('Invalid data format received');
          }
        }
      } catch (err) {
        setError(`Error loading data: ${err instanceof Error ? err.message : String(err)}`);
        console.error("Error loading dataset data:", err);
        
        // Check if we have a last uploaded dataset ID in session storage
        try {
          const lastUploadedId = sessionStorage.getItem('last_uploaded_dataset');
          const previewKey = sessionStorage.getItem('current_upload_preview_key');
          
          if (lastUploadedId && previewKey) {
            const previewDataStr = sessionStorage.getItem(previewKey);
            if (previewDataStr) {
              const previewData = JSON.parse(previewDataStr);
              if (Array.isArray(previewData) && previewData.length > 0) {
                setData(previewData);
                setColumns(Object.keys(previewData[0] || {}));
                setError(null);
                console.log("Recovered using preview data from session storage");
              }
            }
          }
        } catch (recoveryErr) {
          console.error("Recovery attempt failed:", recoveryErr);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [datasetId, dataset]);
  
  // Filter data based on search term
  const filteredData = data.filter(row => {
    if (!searchTerm) return true;
    return Object.values(row).some(value => 
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
  
  // Paginate data
  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );
  
  // Calculate total pages
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  
  // Helper to render pagination
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
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col gap-y-2">
          <CardTitle>Dataset Explorer</CardTitle>
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
            <div className="text-sm text-muted-foreground">
              Total rows: {filteredData.length}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center">Loading data...</div>
        ) : error ? (
          <div className="py-8 text-center text-red-500">
            <div className="mb-2">{error}</div>
            <Button onClick={() => window.location.reload()} variant="outline" size="sm">
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
