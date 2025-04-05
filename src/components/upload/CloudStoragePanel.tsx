
import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CloudStorageOption from './CloudStorageOption';

interface CloudStoragePanelProps {
  selectedStorage: string | null;
  setSelectedStorage: (storage: string) => void;
}

const CloudStoragePanel: React.FC<CloudStoragePanelProps> = ({
  selectedStorage,
  setSelectedStorage
}) => {
  const handleStorageSelection = (storage: string) => {
    setSelectedStorage(storage);
  };

  return (
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
        
        {selectedStorage === 'aws' && (
          <>
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
          </>
        )}

        {selectedStorage === 'azure' && (
          <>
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
          </>
        )}

        {selectedStorage === 'google' && (
          <>
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
          </>
        )}

        {selectedStorage === 'dropbox' && (
          <>
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
          </>
        )}
        
        <div className="text-right">
          <Button className="purple-gradient">
            Connect <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CloudStoragePanel;
