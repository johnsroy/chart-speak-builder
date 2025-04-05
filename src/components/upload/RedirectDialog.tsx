
import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface RedirectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RedirectDialog: React.FC<RedirectDialogProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md text-center p-6 bg-gradient-to-br from-purple-900 to-blue-900 border-purple-500/30">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-16 w-16 rounded-full bg-purple-600/20 animate-pulse" />
            </div>
            <Loader2 className="h-10 w-10 animate-spin text-purple-400" />
          </div>
          
          <h3 className="text-xl font-medium text-white pt-2">
            Upload Successful!
          </h3>
          
          <p className="text-gray-200">
            Redirecting you to the dashboard...
          </p>
          
          <div className="w-full bg-gray-700/50 rounded-full h-1.5 mt-2">
            <div className="bg-purple-500 h-1.5 rounded-full animate-[grow_3s_ease-in-out]"></div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RedirectDialog;
