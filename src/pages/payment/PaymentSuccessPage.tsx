
import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    // Confirm successful payment to user
    toast.success('Payment successful! Your premium plan is now active.');
  }, []);
  
  // Redirect if not logged in
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

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
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;
