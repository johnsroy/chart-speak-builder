
import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft, CreditCard } from 'lucide-react';

const PaymentCanceledPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-purple-900 to-blue-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg text-center glass-card backdrop-blur-xl p-10 rounded-2xl">
        <div className="w-20 h-20 mx-auto bg-gray-600/30 rounded-full flex items-center justify-center mb-6">
          <XCircle className="h-10 w-10 text-gray-400" />
        </div>
        
        <h1 className="text-3xl font-bold mb-2">Payment Canceled</h1>
        <p className="text-xl text-gray-300 mb-8">
          Your payment was not completed and you have not been charged
        </p>
        
        <div className="bg-white/5 backdrop-blur-md rounded-lg p-6 mb-8">
          <h3 className="text-lg font-medium mb-4">You're still on the free plan with:</h3>
          <ul className="space-y-2 text-left">
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">2</span>
              <span>Datasets storage</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">10</span>
              <span>AI-powered queries</span>
            </li>
          </ul>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={() => navigate('/dashboard')}
            variant="outline"
            className="border-gray-500 text-white"
            size="lg"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Return to Dashboard
          </Button>
          
          <Button 
            onClick={() => navigate('/account')}
            className="purple-gradient"
            size="lg"
          >
            <CreditCard className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentCanceledPage;
