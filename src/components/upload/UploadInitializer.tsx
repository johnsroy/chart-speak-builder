
import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { createStorageBucketsDirect, updateAllStoragePolicies, testBucketPermissions } from '@/utils/storageUtils';

interface UploadInitializerProps {
  setBucketsVerified: (verified: boolean | null) => void;
}

const UploadInitializer: React.FC<UploadInitializerProps> = ({
  setBucketsVerified
}) => {
  useEffect(() => {
    const initializeStorage = async () => {
      try {
        console.log("UploadInitializer: Initializing storage...");
        setBucketsVerified(null);
        
        // Try multiple approaches to ensure storage is properly set up
        const approaches = [
          { name: "Edge function", fn: callStorageSetupFunction },
          { name: "Direct bucket creation", fn: createStorageBucketsDirect },
          { name: "Policy update", fn: updateAllStoragePolicies }
        ];
        
        let success = false;
        
        for (const approach of approaches) {
          try {
            console.log(`Trying approach: ${approach.name}`);
            const result = await approach.fn();
            
            if (result) {
              console.log(`Storage initialized successfully using ${approach.name}`);
              success = true;
              
              // Test if we actually have permissions now
              const hasPermissions = await testBucketPermissions('datasets');
              
              if (hasPermissions) {
                console.log("Permission test passed after initialization");
                setBucketsVerified(true);
                toast.success("Storage connected successfully");
                return;
              } else {
                console.warn(`${approach.name} appeared to succeed but permission test failed`);
                // Continue to next approach
              }
            }
          } catch (approachError) {
            console.error(`Error with ${approach.name} approach:`, approachError);
            // Continue to next approach
          }
        }
        
        // Final permission test
        const finalPermissionTest = await testBucketPermissions('datasets');
        
        if (finalPermissionTest) {
          console.log("Permission test passed after all approaches");
          setBucketsVerified(true);
          toast.success("Storage ready for uploads");
        } else {
          console.error("All storage initialization approaches failed");
          setBucketsVerified(false);
          toast.error("Could not initialize storage", {
            description: "Please try again or contact support"
          });
        }
      } catch (error) {
        console.error("Error initializing storage:", error);
        setBucketsVerified(false);
        toast.error("Storage initialization failed", {
          description: error instanceof Error ? error.message : "Unknown error"
        });
      }
    };
    
    initializeStorage();
  }, [setBucketsVerified]);
  
  /**
   * Calls the storage-setup edge function directly
   */
  const callStorageSetupFunction = async (): Promise<boolean> => {
    try {
      console.log("Calling storage-setup edge function...");
      
      const { data, error } = await supabase.functions.invoke('storage-setup', {
        method: 'POST',
        body: { action: 'create-buckets', force: true },
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (error) {
        console.error("Edge function error:", error);
        return false;
      }
      
      if (!data?.success) {
        console.warn("Edge function did not report success:", data);
        return false;
      }
      
      console.log("Edge function succeeded:", data);
      return true;
    } catch (error) {
      console.error("Error calling storage-setup function:", error);
      return false;
    }
  };
  
  return null; // This component doesn't render anything
};

export default UploadInitializer;
