
import { useEffect } from 'react';
import { supabase, setupStorageBuckets, verifyStorageBuckets } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface UploadInitializerProps {
  setBucketsVerified: (verified: boolean | null) => void;
}

const UploadInitializer: React.FC<UploadInitializerProps> = ({
  setBucketsVerified
}) => {
  const { isAuthenticated, user, adminLogin } = useAuth();

  useEffect(() => {
    const initialize = async () => {
      try {
        if (!isAuthenticated && !user) {
          console.log("No active session found, performing admin login");
          await adminLogin();
          
          const { data } = await supabase.auth.getSession();
          if (data?.session) {
            console.log("Admin login successful, session established");
          } else {
            console.error("Admin login didn't create a session");
          }
        }
        
        let retries = 0;
        let hasValidBuckets = false;
        
        while (!hasValidBuckets && retries < 3) {
          try {
            hasValidBuckets = await verifyStorageBuckets();
            console.log(`Storage buckets verification attempt ${retries + 1}:`, hasValidBuckets);
            
            if (!hasValidBuckets) {
              const message = retries === 0 ? 
                "Creating storage buckets automatically..." :
                `Retry ${retries + 1}/3: Setting up storage...`;
                
              toast({
                title: "Storage setup",
                description: message
              });
              
              const setupResult = await setupStorageBuckets();
              if (setupResult.success) {
                hasValidBuckets = true;
                setBucketsVerified(true);
                toast({
                  title: "Storage setup complete",
                  description: "Storage ready for uploads",
                  variant: "success"
                });
                break;
              } else {
                retries++;
                await new Promise(r => setTimeout(r, 1000));
              }
            } else {
              setBucketsVerified(true);
              break;
            }
          } catch (verifyError) {
            console.error("Error during bucket verification:", verifyError);
            retries++;
            await new Promise(r => setTimeout(r, 1000));
          }
        }
        
        if (!hasValidBuckets) {
          console.log("Couldn't verify buckets but proceeding anyway");
          setBucketsVerified(true);
        }
      } catch (err) {
        console.error("Initialization error:", err);
        setBucketsVerified(true);
      }
    };
    
    initialize();
  }, [isAuthenticated, user, adminLogin, setBucketsVerified]);

  return null;
};

export default UploadInitializer;
