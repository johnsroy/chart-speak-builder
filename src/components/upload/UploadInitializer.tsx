
import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { createStorageBucketsDirect, updateAllStoragePolicies, testBucketPermissions } from '@/utils/storageUtils';
import { ensureStorageBuckets } from '@/utils/upload/storage/storageInit';

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
        
        // Try edge function approach
        try {
          console.log("Using modular storage initialization approach");
          await ensureStorageBuckets();
          
          // Test if we can actually upload files
          const hasPermission = await testBucketPermissions('datasets');
          
          if (hasPermission) {
            console.log("Storage permissions verified via new approach");
            setBucketsVerified(true);
            toast.success("Storage connected successfully");
            return;
          }
          
          console.warn("Permission test failed with new approach, trying legacy methods");
        } catch (newError) {
          console.error("Error with new storage initialization:", newError);
        }
        
        // Try legacy approaches as fallback
        const approaches = [
          { name: "Edge function", fn: callStorageSetupFunction },
          { name: "Direct bucket creation", fn: createStorageBucketsDirect },
          { name: "Policy update", fn: updateAllStoragePolicies }
        ];
        
        let success = false;
        
        for (const approach of approaches) {
          try {
            console.log(`Trying legacy approach: ${approach.name}`);
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
        
        // Final permission test - even if all approaches failed, maybe permissions are somehow working
        try {
          const finalPermissionTest = await testBucketPermissions('datasets');
          
          if (finalPermissionTest) {
            console.log("Permission test passed after all approaches");
            setBucketsVerified(true);
            toast.success("Storage ready for uploads");
            return;
          }
        } catch (testError) {
          console.error("Final permission test failed:", testError);
        }
        
        // If we get here, all approaches failed
        console.error("All storage initialization approaches failed");
        setBucketsVerified(false);
        toast.error("Could not initialize storage", {
          description: "Please try again or contact support"
        });
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
      
      // First try using direct fetch with correct URL
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token || '';
        
        const response = await fetch('https://rehadpogugijylybwmoe.supabase.co/functions/v1/storage-setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ action: 'create-buckets', force: true })
        });
        
        if (response.ok) {
          const responseData = await response.json();
          console.log("Edge function direct fetch succeeded:", responseData);
          return responseData?.success || false;
        }
        
        console.error("Edge function HTTP error:", response.status, response.statusText);
      } catch (fetchError) {
        console.error("Error with direct fetch:", fetchError);
      }
      
      // Fallback to supabase.functions.invoke
      const { data, error } = await supabase.functions.invoke('storage-setup', {
        method: 'POST',
        body: { action: 'create-buckets', force: true },
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (error) {
        console.error("Edge function invocation error:", error);
        return false;
      }
      
      if (!data?.success) {
        console.warn("Edge function did not report success:", data);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error calling storage-setup function:", error);
      
      // Last resort fallback to supabase.functions.invoke without error throwing
      try {
        const { data } = await supabase.functions.invoke('storage-setup', {
          method: 'POST',
          body: { action: 'create-buckets', force: true }
        });
        
        return data?.success || false;
      } catch {
        return false;
      }
    }
  };
  
  return null; // This component doesn't render anything
};

export default UploadInitializer;
