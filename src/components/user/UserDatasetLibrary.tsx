
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { dataService } from '@/services/dataService';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Database, HardDrive, Calendar, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface StorageStats {
  totalFiles: number;
  totalSize: number;
  coldStorageFiles: number;
  coldStorageSize: number;
}

interface Dataset {
  id: string;
  name: string;
  file_size: number;
  row_count: number;
  column_schema: Record<string, string>;
  created_at: string;
  storage_bucket?: string;
}

const UserDatasetLibrary = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [recentDataset, setRecentDataset] = useState<Dataset | null>(null);
  const [pastDatasets, setPastDatasets] = useState<Dataset[]>([]);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const navigate = useNavigate();
  
  const {
    user,
    isAuthenticated
  } = useAuth();

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
        const allDatasets = await dataService.getDatasets();
        setDatasets(allDatasets);
        
        // Separate the most recent dataset from past datasets
        if (allDatasets.length > 0) {
          // Sort datasets by creation date (newest first)
          const sortedDatasets = [...allDatasets].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          
          setRecentDataset(sortedDatasets[0]);
          setPastDatasets(sortedDatasets.slice(1));
        }

        // Load storage statistics
        try {
          const stats = await dataService.getStorageStats(user.id);
          setStorageStats(stats);
        } catch (error) {
          console.error('Error getting storage stats:', error);
          // Continue without storage stats
        }
      } catch (error) {
        console.error('Error loading user datasets:', error);
        toast({
          title: "Failed to load datasets",
          description: error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [isAuthenticated, user]);
  
  const handleVisualizeDataset = (datasetId: string) => {
    navigate(`/visualize/${datasetId}`);
  };
  
  if (!isAuthenticated) {
    return <div className="text-center p-10">
        <p>You need to be logged in to view your datasets.</p>
      </div>;
  }
  
  if (isLoading) {
    return <div className="flex flex-col items-center justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p>Loading your datasets...</p>
      </div>;
  }
  
  const renderDatasetCard = (dataset: Dataset) => (
    <div key={dataset.id} className="glass-card p-4 mb-4 border border-white/10 rounded-lg hover:border-purple-500/40 transition-colors">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-lg">{dataset.name}</h3>
          <div className="text-sm text-white/60">
            <p className="flex items-center mt-1">
              <FileText className="h-4 w-4 mr-1" />
              {formatBytes(dataset.file_size)} • {dataset.row_count} rows • {Object.keys(dataset.column_schema).length} columns
            </p>
            <p className="flex items-center mt-1">
              <Clock className="h-4 w-4 mr-1" />
              Uploaded {formatDistanceToNow(new Date(dataset.created_at), { addSuffix: true })}
            </p>
            {dataset.storage_bucket && (
              <p className="flex items-center mt-1 text-xs">
                <HardDrive className="h-3 w-3 mr-1" />
                <span className={dataset.storage_bucket === 'cold_storage' ? 'text-blue-300' : 'text-green-300'}>
                  {dataset.storage_bucket === 'cold_storage' ? 'Cold Storage' : 'Active Storage'}
                </span>
              </p>
            )}
          </div>
        </div>
        <div>
          <Button
            size="sm"
            onClick={() => handleVisualizeDataset(dataset.id)}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            Visualize
          </Button>
        </div>
      </div>
    </div>
  );
  
  return <div className="space-y-8">
      <h2 className="text-2xl font-bold mb-6">Your Dataset Library</h2>
      
      {storageStats && <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
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
              {storageStats.totalSize > 0 && <Progress value={(storageStats.totalSize - storageStats.coldStorageSize) / storageStats.totalSize * 100} className="h-1.5" />}
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
              {storageStats.totalSize > 0 && <Progress value={storageStats.coldStorageSize / storageStats.totalSize * 100} className="h-1.5" />}
            </div>
          </div>
        </div>}
      
      {datasets.length === 0 ? (
        <div className="py-8 text-center glass-card">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <h3 className="text-lg font-medium mb-2">No datasets found</h3>
          <p className="text-white/60 mb-4">You haven't uploaded any datasets yet.</p>
          <Button onClick={() => navigate('/upload')}>Upload Your First Dataset</Button>
        </div>
      ) : (
        <div className="space-y-8">
          {recentDataset && (
            <div>
              <h3 className="text-xl font-medium mb-4 flex items-center">
                <Calendar className="mr-2 h-5 w-5" /> Recent Upload
              </h3>
              {renderDatasetCard(recentDataset)}
            </div>
          )}
          
          {pastDatasets.length > 0 && (
            <div>
              <h3 className="text-xl font-medium mb-4">Previous Uploads</h3>
              <div className="space-y-4">
                {pastDatasets.map(dataset => renderDatasetCard(dataset))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>;
};

export default UserDatasetLibrary;
