
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface StorageConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedStorage: string | null;
}

const StorageConnectionDialog: React.FC<StorageConnectionDialogProps> = ({
  open,
  onOpenChange,
  selectedStorage
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
  );
};

export default StorageConnectionDialog;
