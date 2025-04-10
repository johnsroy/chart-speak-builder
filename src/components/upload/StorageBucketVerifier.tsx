
import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { setupStorageBuckets } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';

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
              const result = await setupStorageBuckets();
              if (result.success) {
                setBucketsVerified(true);
                toast({
                  title: "Storage setup complete",
                  description: "Storage buckets were successfully created.",
                  variant: "success"
                });
              } else {
                toast({
                  title: "Storage setup failed",
                  description: result.message || "Could not create required storage buckets.",
                  variant: "destructive"
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
