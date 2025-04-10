
import React, { useEffect } from 'react';
import { createStorageBucketIfNeeded, verifyStorageBucket } from '@/hooks/upload/storageUtils';

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
          console.log("Storage buckets verified");
          setBucketsVerified(true);
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
