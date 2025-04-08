
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAdminTest, setIsAdminTest] = useState(false);
  const [processingComplete, setProcessingComplete] = useState(false);
  const [loginAttempted, setLoginAttempted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    const testParam = params.get('test');
    const tempPassParam = params.get('temp');
    
    setEmail(emailParam);
    setPassword(tempPassParam);
    setIsAdminTest(testParam === 'true');
    
    // If this is an admin test payment, we need to manually update their subscription
    const handleAdminTestPayment = async () => {
      if (isAdminTest && emailParam === 'admin@example.com') {
        setLoading(true);
        try {
          // Call the webhook function directly with adminTest parameter
          const { error } = await supabase.functions.invoke('stripe-webhook', {
            body: { 
              adminTest: true,
              email: emailParam
            }
          });
          
          if (error) {
            console.error("Error updating admin subscription:", error);
            toast.error("Could not activate admin subscription. Please try again.");
          } else {
            toast.success("Admin test subscription activated");
            setProcessingComplete(true);
          }
        } catch (err) {
          console.error("Failed to process admin test payment:", err);
          toast.error("Failed to process test payment");
        } finally {
          setLoading(false);
        }
      } else {
        // For non-admin users, assume the subscription has been processed by Stripe webhook
        setProcessingComplete(true);
      }
    };
    
    handleAdminTestPayment();
  }, [location.search, isAdminTest]);

  useEffect(() => {
    // Auto-login if we have email but no user
    const autoLogin = async () => {
      // Only attempt login once
      if (loginAttempted) return;
      
      if (email && !user) {
        setLoading(true);
        setLoginAttempted(true);
        
        try {
          if (email === 'admin@example.com') {
            // Admin login with hardcoded password for demo
            const result = await login('admin@example.com', 'password123');
            if (result.success) {
              toast.success("Logged in as admin");
              setProcessingComplete(true);
            } else {
              toast.error("Admin auto-login failed");
              console.error("Admin login failed:", result.error);
            }
          } else if (password) {
            // Try to login with the temporary password if provided
            console.log("Attempting to log in with temporary password");
            const result = await login(email, password);
            
            if (result.success) {
              toast.success("Logged in successfully");
              setProcessingComplete(true);
            } else {
              console.error("Auto-login failed with temp password:", result.error);
              toast.error("Couldn't log in automatically. Please use the login link below.");
            }
          } else {
            console.log("No temporary password available for auto-login");
          }
        } catch (error) {
          console.error("Auto-login failed:", error);
          toast.error("Couldn't log in automatically");
        } finally {
          setLoading(false);
        }
      } else if (user) {
        // User is already logged in
        setProcessingComplete(true);
      }
    };
    
    autoLogin();
  }, [email, user, login, password, loginAttempted]);

  const handleDashboardRedirect = () => {
    if (user) {
      navigate('/upload'); // Redirect to the upload page if logged in
    } else {
      // If auto-login failed, direct them to login page with their email prefilled
      navigate(`/login?email=${encodeURIComponent(email || '')}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-purple-900 to-blue-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg text-center glass-card backdrop-blur-xl p-10 rounded-2xl">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 text-purple-400 animate-spin mb-4" />
            <h2 className="text-2xl font-bold mb-2">Processing Payment</h2>
            <p className="text-gray-300">Please wait while we activate your subscription...</p>
          </div>
        ) : (
          <>
            <div className="w-20 h-20 mx-auto bg-green-900/30 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 text-green-400" />
            </div>
            
            <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
            <p className="text-xl text-gray-300 mb-8">
              {isAdminTest ? 
                'Your admin test payment has been processed successfully.' : 
                'Thank you for subscribing to GenBI Premium'}
            </p>
            
            <div className="bg-white/5 backdrop-blur-md rounded-lg p-6 mb-8">
              <h3 className="text-lg font-medium mb-4">You now have access to:</h3>
              <ul className="space-y-3 text-left">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center text-xs">✓</span>
                  <span>Unlimited datasets</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center text-xs">✓</span>
                  <span>Unlimited AI-powered queries</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center text-xs">✓</span>
                  <span>Advanced visualization tools</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center text-xs">✓</span>
                  <span>Premium support</span>
                </li>
              </ul>
            </div>
            
            {email && !user && (
              <div className="bg-purple-900/30 border border-purple-500/20 rounded-lg p-4 mb-6">
                <p className="text-sm mb-3">
                  We've created an account for you using: <strong>{email}</strong>
                </p>
                <p className="text-sm text-gray-300 mb-2">
                  A confirmation email has been sent to your inbox.
                </p>
                {!isAdminTest && (
                  <Button 
                    variant="outline" 
                    className="text-sm border-purple-500/30 hover:bg-purple-500/20 mt-2"
                    onClick={() => navigate(`/login?email=${encodeURIComponent(email || '')}`)}
                  >
                    Go to login page
                  </Button>
                )}
              </div>
            )}
            
            <Button 
              onClick={handleDashboardRedirect}
              className="purple-gradient"
              size="lg"
              disabled={!processingComplete}
            >
              {processingComplete ? (
                <>Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" /></>
              ) : (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Preparing Dashboard
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
