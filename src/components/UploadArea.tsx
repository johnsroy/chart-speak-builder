
import React, { useState, useEffect } from 'react';
import { Upload, Download, Database, ExternalLink, FileType, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { dataService } from '@/services/dataService';
import { useAuth } from '@/hooks/useAuth';
import { Progress } from '@/components/ui/progress';
import ChartBuilder from '@/components/ChartBuilder';
import { useNavigate } from 'react-router-dom';
import ChartVisualization from '@/components/ChartVisualization';

const UploadArea = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [dragActive, setDragActive] = useState(false);
  const [selectedStorage, setSelectedStorage] = useState<string | null>(null);
  const [showStorageDialog, setShowStorageDialog] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState('');
  const [datasetDescription, setDatasetDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showVisualizeAfterUpload, setShowVisualizeAfterUpload] = useState(false);
  const [uploadedDatasetId, setUploadedDatasetId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [schemaPreview, setSchemaPreview] = useState<Record<string, string> | null>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      loadDatasets();
    }
  }, [isAuthenticated]);

  const loadDatasets = async () => {
    setIsLoading(true);
    try {
      const data = await dataService.getDatasets();
      setDatasets(data);

      // Select the first dataset by default if available
      if (data.length > 0 && !selectedDatasetId) {
        setSelectedDatasetId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading datasets:', error);
      toast({
        title: 'Error loading datasets',
        description: error instanceof Error ? error.message : 'Failed to load datasets',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileSelection(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFileSelection(file);
    }
  };

  const handleFileSelection = (file: File) => {
    // Validate file type
    const validFileTypes = [
      'text/csv', 
      'application/vnd.ms-excel', 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/json'
    ];
    
    if (!validFileTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV, Excel or JSON file",
        variant: "destructive"
      });
      return;
    }
    
    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 100MB",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedFile(file);
    // Auto-fill dataset name with file name (without extension)
    const fileName = file.name;
    setDatasetName(fileName.substring(0, fileName.lastIndexOf('.')) || fileName);
    
    // Preview schema inference
    previewSchemaInference(file);
    
    toast({
      title: "File received",
      description: `Selected: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`
    });
  };

  const previewSchemaInference = async (file: File) => {
    try {
      // Only preview for CSV files
      if (file.type === 'text/csv') {
        const schemaSample = await dataService.previewSchemaInference(file);
        setSchemaPreview(schemaSample);
      } else {
        setSchemaPreview(null);
      }
    } catch (error) {
      console.error('Error previewing schema:', error);
      setSchemaPreview(null);
    }
  };

  const handleStorageSelection = (storage: string) => {
    setSelectedStorage(storage);
    setShowStorageDialog(true);
  };

  const simulateProgress = () => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 500);
    
    return () => clearInterval(interval);
  };

  const handleUpload = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please log in to upload datasets",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }
    
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive"
      });
      return;
    }
    
    if (!datasetName.trim()) {
      toast({
        title: "Dataset name required",
        description: "Please provide a name for your dataset",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    const stopProgressSimulation = simulateProgress();
    
    try {
      const dataset = await dataService.uploadDataset(selectedFile, datasetName, datasetDescription || undefined);
      
      // Set progress to 100% when complete
      setUploadProgress(100);
      
      sonnerToast.success("Upload successful", {
        description: `Dataset "${datasetName}" has been uploaded successfully`
      });

      // Store the uploaded dataset ID for visualization
      setUploadedDatasetId(dataset.id);
      setShowVisualizeAfterUpload(true);

      // Clear form
      setSelectedFile(null);
      setDatasetName('');
      setDatasetDescription('');
      setSchemaPreview(null);

      // Reload datasets
      await loadDatasets();
    } catch (error) {
      console.error('Error uploading dataset:', error);
      setUploadError(error instanceof Error ? error.message : "Failed to upload dataset");
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload dataset",
        variant: "destructive"
      });
    } finally {
      clearInterval(stopProgressSimulation);
      setIsUploading(false);
    }
  };

  const retryUpload = () => {
    setUploadError(null);
    handleUpload();
  };

  return (
    <div className="container mx-auto py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gradient">Upload or Connect Your Data</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Upload your files or connect to cloud storage to generate powerful visualizations and insights.
        </p>
      </div>
      
      {!isAuthenticated && (
        <div className="bg-yellow-500/20 border border-yellow-500/50 p-4 rounded-lg mb-8 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <p>You need to be logged in to upload and visualize data. Please <Button variant="link" className="p-0 text-primary" onClick={() => navigate('/login')}>log in</Button> to continue.</p>
        </div>
      )}
      
      <div className="flex justify-center mb-8">
        <div className="glass-card p-2 inline-flex gap-2">
          <TabButton active={activeTab === 'upload'} icon={<Upload className="h-4 w-4 mr-2" />} label="Upload" onClick={() => setActiveTab('upload')} />
          <TabButton active={activeTab === 'visualize'} icon={<Database className="h-4 w-4 mr-2" />} label="Visualize" onClick={() => setActiveTab('visualize')} />
          <TabButton active={activeTab === 'transform'} icon={<ExternalLink className="h-4 w-4 mr-2" />} label="Transform" onClick={() => setActiveTab('transform')} />
          <TabButton active={activeTab === 'export'} icon={<Download className="h-4 w-4 mr-2" />} label="Export & Share" onClick={() => setActiveTab('export')} />
        </div>
      </div>
      
      <div>
        {activeTab === 'upload' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="glass-card p-6">
              <h2 className="text-xl font-medium mb-4 text-left">Upload File</h2>
              
              <div 
                className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center h-64 transition-colors cursor-pointer ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'}`} 
                onDragEnter={handleDrag} 
                onDragLeave={handleDrag} 
                onDragOver={handleDrag} 
                onDrop={handleDrop} 
                onClick={() => document.getElementById('fileInput')?.click()}
              >
                <div className="p-4 bg-secondary rounded-full mb-4">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <p className="text-lg font-medium mb-2">
                  {selectedFile ? selectedFile.name : 'Drag & Drop Your File'}
                </p>
                <p className="text-sm mb-4 text-slate-100">Supported formats: CSV, Excel, JSON</p>
                <input 
                  type="file" 
                  id="fileInput" 
                  className="hidden" 
                  onChange={handleFileInput} 
                  accept=".csv,.xlsx,.xls,.json" 
                  disabled={isUploading}
                />
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="font-bold bg-violet-900 hover:bg-violet-800"
                  disabled={isUploading}
                >
                  <Upload className="h-4 w-4 mr-2" /> Browse Files
                </Button>
              </div>
              
              {uploadError && (
                <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-md p-4">
                  <h3 className="flex items-center text-red-400 font-medium">
                    <AlertTriangle className="h-4 w-4 mr-2" /> 
                    Upload Failed
                  </h3>
                  <p className="mt-1 text-sm text-red-300">{uploadError}</p>
                  <div className="mt-3 flex justify-end">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={retryUpload}
                      disabled={isUploading}
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              )}
              
              {selectedFile && !uploadError && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Dataset Name</label>
                    <input 
                      type="text" 
                      value={datasetName} 
                      onChange={e => setDatasetName(e.target.value)} 
                      className="w-full px-3 py-2 rounded-md border bg-white/10 backdrop-blur-sm border-white/20 focus:outline-none focus:ring-2 focus:ring-primary" 
                      placeholder="Enter dataset name" 
                      disabled={isUploading}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">Description (optional)</label>
                    <textarea 
                      value={datasetDescription} 
                      onChange={e => setDatasetDescription(e.target.value)} 
                      className="w-full px-3 py-2 rounded-md border bg-white/10 backdrop-blur-sm border-white/20 focus:outline-none focus:ring-2 focus:ring-primary" 
                      placeholder="Enter dataset description" 
                      rows={3}
                      disabled={isUploading}
                    />
                  </div>
                  
                  {schemaPreview && (
                    <div className="bg-white/10 rounded-md p-3 border border-white/20">
                      <h4 className="text-sm font-medium mb-2">Schema Preview</h4>
                      <div className="max-h-40 overflow-y-auto text-xs">
                        <table className="min-w-full">
                          <thead>
                            <tr>
                              <th className="text-left py-1 px-2">Column</th>
                              <th className="text-left py-1 px-2">Type</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(schemaPreview).map(([column, type], idx) => (
                              <tr key={idx} className={idx % 2 === 0 ? "bg-white/5" : ""}>
                                <td className="py-1 px-2">{column}</td>
                                <td className="py-1 px-2">{type}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  {isUploading && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Uploading...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-1" />
                    </div>
                  )}
                  
                  <Button 
                    onClick={handleUpload} 
                    disabled={isUploading || !datasetName.trim()} 
                    className="w-full purple-gradient"
                  >
                    {isUploading ? 'Uploading...' : 'Upload Dataset'}
                  </Button>
                </div>
              )}
            </div>
            
            {uploadedDatasetId && showVisualizeAfterUpload ? (
              <div className="glass-card p-6">
                <h2 className="text-xl font-medium mb-4 text-left">Dataset Visualization</h2>
                <ChartVisualization datasetId={uploadedDatasetId} />
                <div className="mt-6 flex justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowVisualizeAfterUpload(false)} 
                    className="mr-2"
                  >
                    Hide Visualization
                  </Button>
                  <Button onClick={() => {
                    setActiveTab('visualize');
                    setSelectedDatasetId(uploadedDatasetId);
                  }}>
                    Explore More
                  </Button>
                </div>
              </div>
            ) : (
              <div className="glass-card p-6">
                <h2 className="text-xl font-medium mb-4 text-left">Connect to Cloud Storage</h2>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <CloudStorageOption 
                    name="AWS S3" 
                    icon={<div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <span className="text-orange-500">S3</span>
                    </div>} 
                    onClick={() => handleStorageSelection('aws')} 
                    isActive={selectedStorage === 'aws'} 
                  />
                  
                  <CloudStorageOption 
                    name="Azure Storage" 
                    icon={<div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-500">Az</span>
                    </div>} 
                    onClick={() => handleStorageSelection('azure')} 
                    isActive={selectedStorage === 'azure'} 
                  />
                  
                  <CloudStorageOption 
                    name="Google Cloud Storage" 
                    icon={<div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                      <span className="text-red-500">GC</span>
                    </div>} 
                    onClick={() => handleStorageSelection('google')} 
                    isActive={selectedStorage === 'google'} 
                  />
                  
                  <CloudStorageOption 
                    name="Dropbox" 
                    icon={<div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-500">Db</span>
                    </div>} 
                    onClick={() => handleStorageSelection('dropbox')} 
                    isActive={selectedStorage === 'dropbox'} 
                  />
                </div>
                
                <div className="bg-white/70 p-4 rounded-lg">
                  <h3 className="text-md font-medium mb-3 text-left text-gray-800">
                    {selectedStorage === 'azure' ? 'Connect to Azure Storage' : 
                     selectedStorage === 'google' ? 'Connect to Google Cloud Storage' : 
                     selectedStorage === 'dropbox' ? 'Connect to Dropbox' : 
                     'Connect to AWS S3'}
                  </h3>
                  
                  {selectedStorage === 'aws' && <>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 text-left mb-1">Access Key ID</label>
                          <input type="text" placeholder="Enter Access Key ID" className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 text-left mb-1">Secret Access Key</label>
                          <input type="password" placeholder="Enter Secret Access Key" className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 text-left mb-1">Bucket Name</label>
                        <input type="text" placeholder="Enter Bucket Name" className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 text-left mb-1">Region</label>
                        <select className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30">
                          <option>Select Region</option>
                          <option>us-east-1</option>
                          <option>us-west-1</option>
                          <option>eu-west-1</option>
                          <option>ap-south-1</option>
                        </select>
                      </div>
                    </>}

                  {selectedStorage === 'azure' && <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 text-left mb-1">Storage Account Name</label>
                        <input type="text" placeholder="Enter Storage Account Name" className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 text-left mb-1">Access Key</label>
                        <input type="password" placeholder="Enter Access Key" className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 text-left mb-1">Container Name</label>
                        <input type="text" placeholder="Enter Container Name" className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 text-left mb-1">Connection String (optional)</label>
                        <input type="password" placeholder="Enter Connection String" className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                    </>}

                  {selectedStorage === 'google' && <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 text-left mb-1">Project ID</label>
                        <input type="text" placeholder="Enter Project ID" className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 text-left mb-1">Bucket Name</label>
                        <input type="text" placeholder="Enter Bucket Name" className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 text-left mb-1">JSON Key File</label>
                        <div className="flex items-center">
                          <input type="file" id="jsonKeyFile" className="hidden" />
                          <input type="text" placeholder="No file selected" className="w-full px-3 py-2 rounded-l-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30" readOnly />
                          <Button size="sm" variant="outline" className="rounded-l-none border-l-0" onClick={() => document.getElementById('jsonKeyFile')?.click()}>
                            Browse
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-left">Upload your Google Cloud service account key JSON file</p>
                      </div>
                    </>}

                  {selectedStorage === 'dropbox' && <>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 text-left mb-1">App Key</label>
                        <input type="text" placeholder="Enter App Key" className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 text-left mb-1">App Secret</label>
                        <input type="password" placeholder="Enter App Secret" className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 text-left mb-1">Access Token</label>
                        <input type="password" placeholder="Enter Access Token" className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                      </div>
                      
                      <div className="mb-4">
                        <Button variant="outline" size="sm" className="w-full">
                          <ExternalLink className="h-4 w-4 mr-2" /> Authorize Dropbox Account
                        </Button>
                        <p className="text-xs text-gray-500 mt-1 text-left">Connect via OAuth to authorize access to your Dropbox account</p>
                      </div>
                    </>}
                  
                  <div className="text-right">
                    <Button className="purple-gradient">
                      Connect <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'visualize' ? (
          <div className="glass-card p-6">
            {isLoading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-pulse">Loading datasets...</div>
              </div>
            ) : datasets.length === 0 ? (
              <div className="text-center py-10">
                <Database className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-medium mb-2">No datasets found</h3>
                <p className="text-gray-400 mb-4">Upload a dataset to get started with visualization</p>
                <Button onClick={() => setActiveTab('upload')}>
                  <Upload className="h-4 w-4 mr-2" /> Upload Dataset
                </Button>
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap gap-2 mb-6">
                  {datasets.map(dataset => (
                    <button 
                      key={dataset.id} 
                      className={`px-3 py-2 rounded-md text-sm ${selectedDatasetId === dataset.id ? 'bg-primary text-white' : 'bg-white/20 hover:bg-white/30'}`} 
                      onClick={() => setSelectedDatasetId(dataset.id)}
                    >
                      {dataset.name}
                    </button>
                  ))}
                </div>
                
                {selectedDatasetId && <ChartVisualization datasetId={selectedDatasetId} />}
              </div>
            )}
          </div>
        ) : activeTab === 'transform' ? (
          <div className="glass-card p-6">
            <div className="text-center py-10">
              <ExternalLink className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-medium mb-2">Data Transformation</h3>
              <p className="text-gray-400 mb-4">Transform your data with advanced operations</p>
              <p className="text-sm text-gray-500 mb-6">Coming soon in the next version</p>
            </div>
          </div>
        ) : (
          <div className="glass-card p-6">
            <div className="text-center py-10">
              <Download className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-xl font-medium mb-2">Export & Share</h3>
              <p className="text-gray-400 mb-4">Export your visualizations or share them with others</p>
              <p className="text-sm text-gray-500 mb-6">Coming soon in the next version</p>
            </div>
          </div>
        )}
      </div>

      {/* Cloud Storage Dialog */}
      <Dialog open={showStorageDialog} onOpenChange={setShowStorageDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedStorage === 'azure' ? 'Connect to Azure Storage' : 
               selectedStorage === 'google' ? 'Connect to Google Cloud Storage' : 
               selectedStorage === 'dropbox' ? 'Connect to Dropbox' : 
               'Connect to Cloud Storage'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="p-4">
            {selectedStorage === 'azure' && <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Storage Account Name</label>
                  <input type="text" placeholder="Enter Storage Account Name" className="w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Access Key</label>
                  <input type="password" placeholder="Enter Access Key" className="w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Container Name</label>
                  <input type="text" placeholder="Enter Container Name" className="w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <Button className="w-full purple-gradient">Connect to Azure</Button>
              </div>}
            
            {selectedStorage === 'google' && <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Project ID</label>
                  <input type="text" placeholder="Enter Project ID" className="w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bucket Name</label>
                  <input type="text" placeholder="Enter Bucket Name" className="w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">JSON Key File</label>
                  <div className="flex">
                    <input type="text" placeholder="No file selected" className="w-full px-3 py-2 rounded-l-md border focus:outline-none focus:ring-2 focus:ring-primary/30" readOnly />
                    <Button variant="outline" className="rounded-l-none">Browse</Button>
                  </div>
                </div>
                <Button className="w-full purple-gradient">Connect to Google Cloud</Button>
              </div>}
            
            {selectedStorage === 'dropbox' && <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">App Key</label>
                  <input type="text" placeholder="Enter App Key" className="w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">App Secret</label>
                  <input type="password" placeholder="Enter App Secret" className="w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Access Token</label>
                  <input type="password" placeholder="Enter Access Token" className="w-full px-3 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <Button className="w-full purple-gradient">Connect to Dropbox</Button>
              </div>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const TabButton = ({
  active,
  icon,
  label,
  onClick
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) => (
  <button 
    className={`px-5 py-2 rounded-lg flex items-center ${active ? 'bg-primary text-white' : 'hover:bg-white/50'}`} 
    onClick={onClick}
  >
    {icon}
    {label}
  </button>
);

const CloudStorageOption = ({
  name,
  icon,
  onClick,
  isActive = false
}: {
  name: string;
  icon: React.ReactNode;
  onClick?: () => void;
  isActive?: boolean;
}) => (
  <button 
    className={`p-4 border rounded-lg flex flex-col items-center transition-colors ${isActive ? 'bg-primary/10 border-primary' : 'border-gray-200 hover:bg-white/50'}`} 
    onClick={onClick}
  >
    {icon}
    <span className="mt-2 text-sm">{name}</span>
  </button>
);

export default UploadArea;
