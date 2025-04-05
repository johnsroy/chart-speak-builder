
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { dataService } from '@/services/dataService';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Database, HardDrive } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';

interface StorageStats {
  totalFiles: number;
  totalSize: number;
  coldStorageFiles: number;
  coldStorageSize: number;
}

const UserDatasetLibrary = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const { user, isAuthenticated } = useAuth();

  // Format bytes to human readable format
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  useEffect(() => {
    const loadData = async () => {
      if (!isAuthenticated || !user) {
        setIsLoading(false);
        return;
      }

      try {
        // Load datasets
        const datasets = await dataService.getDatasets();
        setDatasets(datasets);
        
        // Load storage statistics
        const stats = await dataService.getStorageStats(user.id);
        setStorageStats(stats);
      } catch (error) {
        console.error('Error loading user datasets:', error);
        toast({
          title: "Failed to load datasets",
          description: error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return (
      <div className="text-center p-10">
        <p>You need to be logged in to view your datasets.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p>Loading your datasets...</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6">
      <h2 className="text-2xl font-bold mb-6">Your Dataset Library</h2>
      
      {storageStats && (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <h3 className="text-lg font-medium mb-2 flex items-center">
              <Database className="mr-2 h-5 w-5" /> Active Storage
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Files:</span>
                <span>{storageStats.totalFiles - storageStats.coldStorageFiles}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Size:</span>
                <span>{formatBytes(storageStats.totalSize - storageStats.coldStorageSize)}</span>
              </div>
              {storageStats.totalSize > 0 && (
                <Progress 
                  value={((storageStats.totalSize - storageStats.coldStorageSize) / storageStats.totalSize) * 100} 
                  className="h-1.5" 
                />
              )}
            </div>
          </div>
          
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <h3 className="text-lg font-medium mb-2 flex items-center">
              <HardDrive className="mr-2 h-5 w-5" /> Cold Storage
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Files:</span>
                <span>{storageStats.coldStorageFiles}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Size:</span>
                <span>{formatBytes(storageStats.coldStorageSize)}</span>
              </div>
              {storageStats.totalSize > 0 && (
                <Progress 
                  value={(storageStats.coldStorageSize / storageStats.totalSize) * 100} 
                  className="h-1.5" 
                />
              )}
            </div>
          </div>
        </div>
      )}
      
      <div className="divide-y divide-white/10">
        {datasets.length === 0 ? (
          <div className="py-8 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
            <h3 className="text-lg font-medium mb-2">No datasets found</h3>
            <p className="text-white/60 mb-4">You haven't uploaded any datasets yet.</p>
            <Button onClick={() => window.location.href = '/upload'}>Upload Your First Dataset</Button>
          </div>
        ) : (
          datasets.map((dataset) => (
            <div key={dataset.id} className="py-4 flex justify-between items-center">
              <div>
                <h3 className="font-medium">{dataset.name}</h3>
                <div className="text-sm text-white/60">
                  <p>{formatBytes(dataset.file_size)} • {dataset.row_count} rows • {Object.keys(dataset.column_schema).length} columns</p>
                  <p>Uploaded {formatDistanceToNow(new Date(dataset.created_at), { addSuffix: true })}</p>
                  <p className="text-xs mt-1">
                    Storage: <span className={dataset.storage_bucket === 'cold_storage' ? 'text-blue-300' : 'text-green-300'}>
                      {dataset.storage_bucket === 'cold_storage' ? 'Cold Storage' : 'Active Storage'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline" onClick={() => window.location.href = `/visualize/${dataset.id}`}>Visualize</Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UserDatasetLibrary;
