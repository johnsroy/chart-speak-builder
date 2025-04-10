
import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createStorageBucketIfNeeded } from '@/hooks/upload/storageUtils';
import { toast } from 'sonner';

interface StorageBucketVerifierProps {
  bucketsVerified: boolean | null;
  setBucketsVerified: (verified: boolean) => void;
}

const StorageBucketVerifier: React.FC<StorageBucketVerifierProps> = ({
  bucketsVerified,
  setBucketsVerified
}) => {
  if (bucketsVerified !== false) return null;
  
  return (
    <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-lg mb-8 flex items-center gap-3">
      <AlertTriangle className="h-5 w-5 text-red-500" />
      <div>
        <p>Storage system not properly configured. Required buckets are missing.</p>
        <div className="mt-2">
          <Button 
            variant="outline" 
            className="bg-red-500/20 hover:bg-red-500/30 border-red-500/50" 
            onClick={async () => {
              const success = await createStorageBucketIfNeeded();
              if (success) {
                setBucketsVerified(true);
                toast.success("Storage setup complete", {
                  description: "Storage buckets were successfully created."
                });
              }
            }}
          >
            Setup Storage Buckets
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StorageBucketVerifier;
