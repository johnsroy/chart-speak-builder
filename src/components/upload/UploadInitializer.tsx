
import React, { useEffect } from 'react';
import { createStorageBucketIfNeeded, verifyStorageBucket } from '@/hooks/upload/storageUtils';
import { updateAllStoragePolicies, testBucketPermissions } from '@/utils/storageUtils';

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
        const bucketsExist = await verifyStorageBucket();
        
        if (!bucketsExist) {
          console.log("Required storage buckets missing, attempting to create");
          setBucketsVerified(false);
          
          // Try to create the buckets automatically
          const created = await createStorageBucketIfNeeded();
          if (created) {
            console.log("Storage buckets created successfully");
            setBucketsVerified(true);
          } 
          // False state already set above, no need to set it again
        } else {
          console.log("Storage buckets verified, testing permissions...");
          
          // Test if we have permissions by trying to upload a test file
          const hasPermissions = await testBucketPermissions('datasets');
          
          if (!hasPermissions) {
            console.warn("Permission test failed, updating policies...");
            const policiesUpdated = await updateAllStoragePolicies();
            
            if (policiesUpdated) {
              console.log("Storage policies updated successfully");
              setBucketsVerified(true);
            } else {
              console.warn("Failed to update storage policies");
              setBucketsVerified(false);
            }
          } else {
            console.log("Storage permissions verified");
            setBucketsVerified(true);
          }
        }
      } catch (error) {
        console.error("Error initializing storage:", error);
        setBucketsVerified(false);
      }
    };
    
    initializeStorage();
  }, [setBucketsVerified]);
  
  return null; // This component doesn't render anything
};

export default UploadInitializer;
