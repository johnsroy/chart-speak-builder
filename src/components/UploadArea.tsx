
import React, { useState } from 'react';
import { Upload, Download, Database, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

const UploadArea = () => {
  const [activeTab, setActiveTab] = useState('upload');
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();
  
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
      // Handle file upload
      toast({
        title: "File received",
        description: `Uploading ${e.dataTransfer.files[0].name}`,
      });
    }
  };
  
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      // Handle file upload
      toast({
        title: "File selected",
        description: `Uploading ${e.target.files[0].name}`,
      });
    }
  };

  return (
    <div className="container mx-auto py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold mb-4 text-gradient">Upload or Connect Your Data</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Upload your files or connect to cloud storage to generate powerful visualizations and insights.
        </p>
      </div>
      
      <div className="flex justify-center mb-8">
        <div className="glass-card p-2 inline-flex gap-2">
          <TabButton 
            active={activeTab === 'upload'} 
            icon={<Upload className="h-4 w-4 mr-2" />} 
            label="Upload"
            onClick={() => setActiveTab('upload')}
          />
          <TabButton 
            active={activeTab === 'visualize'} 
            icon={<Database className="h-4 w-4 mr-2" />} 
            label="Visualize" 
            onClick={() => setActiveTab('visualize')}
          />
          <TabButton 
            active={activeTab === 'transform'} 
            icon={<ExternalLink className="h-4 w-4 mr-2" />} 
            label="Transform" 
            onClick={() => setActiveTab('transform')}
          />
          <TabButton 
            active={activeTab === 'export'} 
            icon={<Download className="h-4 w-4 mr-2" />} 
            label="Export & Share" 
            onClick={() => setActiveTab('export')}
          />
        </div>
      </div>
      
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
            <p className="text-lg font-medium mb-2">Drag & Drop Your File</p>
            <p className="text-sm text-muted-foreground mb-4">Supported formats: CSV, Excel, JSON</p>
            <input 
              type="file" 
              id="fileInput" 
              className="hidden" 
              onChange={handleFileInput}
              accept=".csv,.xlsx,.xls,.json"
            />
            <Button size="sm" variant="outline" className="bg-white">
              <Upload className="h-4 w-4 mr-2" /> Browse Files
            </Button>
          </div>
        </div>
        
        <div className="glass-card p-6">
          <h2 className="text-xl font-medium mb-4 text-left">Connect to Cloud Storage</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <CloudStorageOption 
              name="AWS S3" 
              icon={
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <span className="text-orange-500">S3</span>
                </div>
              } 
            />
            
            <CloudStorageOption 
              name="Azure Storage" 
              icon={
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-500">Az</span>
                </div>
              } 
            />
            
            <CloudStorageOption 
              name="Google Cloud Storage" 
              icon={
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-red-500">GC</span>
                </div>
              } 
            />
            
            <CloudStorageOption 
              name="Dropbox" 
              icon={
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-500">Db</span>
                </div>
              } 
            />
          </div>
          
          <div className="bg-white/70 p-4 rounded-lg">
            <h3 className="text-md font-medium mb-3 text-left">Connect to AWS S3</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 text-left mb-1">Access Key ID</label>
                <input 
                  type="text" 
                  placeholder="Enter Access Key ID"
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 text-left mb-1">Secret Access Key</label>
                <input 
                  type="password" 
                  placeholder="Enter Secret Access Key"
                  className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 text-left mb-1">Bucket Name</label>
              <input 
                type="text" 
                placeholder="Enter Bucket Name"
                className="w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
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
            
            <div className="text-right">
              <Button className="purple-gradient">
                Connect <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ active, icon, label, onClick }: { 
  active: boolean; 
  icon: React.ReactNode; 
  label: string;
  onClick: () => void;
}) => (
  <button
    className={`px-5 py-2 rounded-lg flex items-center ${
      active ? 'bg-primary text-white' : 'hover:bg-white/50'
    }`}
    onClick={onClick}
  >
    {icon}
    {label}
  </button>
);

const CloudStorageOption = ({ name, icon }: { name: string; icon: React.ReactNode }) => (
  <button className="p-4 border border-gray-200 rounded-lg hover:bg-white/50 flex flex-col items-center transition-colors">
    {icon}
    <span className="mt-2 text-sm">{name}</span>
  </button>
);

export default UploadArea;
