
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, login } = useAuth();
  const [email, setEmail] = useState<string | null>(null);
  
  useEffect(() => {
    // Extract email from URL if present
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
    
    // Confirm successful payment to user
    toast.success('Payment successful! Your premium plan is now active.');
    
    // If not authenticated but we have an email from the URL,
    // try to find out if there's a Stripe session completion to confirm
    if (!isAuthenticated && emailParam) {
      // We could potentially auto-login the user here if we had stored 
      // temporary credentials, but this would require additional security measures
      console.log("User completed payment as a new user with email:", emailParam);
    }
  }, [location, isAuthenticated]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-purple-900 to-blue-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg text-center glass-card backdrop-blur-xl p-10 rounded-2xl">
        <div className="w-20 h-20 mx-auto bg-green-600/30 rounded-full flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle className="h-10 w-10 text-green-400" />
        </div>
        
        <h1 className="text-3xl font-bold mb-2">Payment Successful!</h1>
        <p className="text-xl text-gray-300 mb-6">
          Thank you for upgrading to our Premium Plan
        </p>
        
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium mb-4 text-gradient">Your premium features are now active:</h3>
          <ul className="space-y-3 text-left">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
              <span>Access to 100 datasets storage</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
              <span>1,000 AI-powered queries</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
              <span>Advanced visualization capabilities</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
              <span>Priority customer support</span>
            </li>
          </ul>
        </div>
        
        {!isAuthenticated && email && (
          <div className="mb-6 bg-purple-900/30 border border-purple-500/20 p-4 rounded-lg text-left">
            <p className="mb-2 text-white">Your account has been created with email: <strong>{email}</strong></p>
            <p className="text-gray-300">You can now log in with this email address. Check your inbox for login instructions.</p>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {isAuthenticated ? (
            <>
              <Button 
                onClick={() => navigate('/dashboard')}
                className="purple-gradient"
                size="lg"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              <Button 
                onClick={() => navigate('/upload')}
                variant="outline"
                className="border-purple-500 text-white"
                size="lg"
              >
                Upload New Dataset
              </Button>
            </>
          ) : (
            <>
              <Button 
                onClick={() => navigate('/login')}
                className="purple-gradient"
                size="lg"
              >
                Log In Now
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              
              <Button 
                onClick={() => navigate('/')}
                variant="outline"
                className="border-purple-500 text-white"
                size="lg"
              >
                Back to Home
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
