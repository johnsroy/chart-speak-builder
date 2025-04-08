
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { FREE_TIER_LIMITS, PREMIUM_TIER_LIMITS } from '@/models/UserSubscription';
import { Loader2, CheckCircle, XCircle, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const SubscriptionCard = () => {
  const { user, subscription } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const isPremium = subscription?.isPremium || false;
  const datasetsUsed = subscription?.datasetsUsed || 0;
  const queriesUsed = subscription?.queriesUsed || 0;
  const datasetQuota = subscription?.datasetQuota || FREE_TIER_LIMITS.datasets;
  const queryQuota = subscription?.queryQuota || FREE_TIER_LIMITS.queries;
  
  const datasetPercentage = Math.min(Math.round((datasetsUsed / datasetQuota) * 100), 100);
  const queryPercentage = Math.min(Math.round((queriesUsed / queryQuota) * 100), 100);

  const handleUpgradeClick = async () => {
    if (!user) {
      toast.error('Please sign in to upgrade your subscription');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        method: 'POST',
      });

      if (error) throw error;
      
      window.location.href = data.url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to start checkout process. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full glass-card text-white border-purple-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-gradient">
            {isPremium ? 'Premium Plan' : 'Free Plan'}
          </span>
          {isPremium && (
            <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full">Active</span>
          )}
        </CardTitle>
        <CardDescription className="text-gray-300">
          {isPremium 
            ? 'Enjoy unlimited data analysis with our premium plan'
            : 'You are currently on the free plan with limited features'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span>Datasets</span>
              <span>{datasetsUsed} / {datasetQuota}</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full">
              <div 
                className={`h-2 rounded-full ${datasetPercentage > 90 ? 'bg-red-500' : 'bg-purple-500'}`} 
                style={{ width: `${datasetPercentage}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between mb-1 text-sm">
              <span>AI Queries</span>
              <span>{queriesUsed} / {queryQuota}</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full">
              <div 
                className={`h-2 rounded-full ${queryPercentage > 90 ? 'bg-red-500' : 'bg-purple-500'}`} 
                style={{ width: `${queryPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        <div className="pt-4 border-t border-white/10">
          <h4 className="font-medium mb-3">Plan Details:</h4>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              {isPremium ? (
                <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
              )}
              <span>{isPremium ? PREMIUM_TIER_LIMITS.datasets : FREE_TIER_LIMITS.datasets} datasets storage</span>
            </li>
            
            <li className="flex items-start gap-2">
              {isPremium ? (
                <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
              )}
              <span>{isPremium ? PREMIUM_TIER_LIMITS.queries : FREE_TIER_LIMITS.queries} AI-powered queries</span>
            </li>
            
            <li className="flex items-start gap-2">
              {isPremium ? (
                <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
              )}
              <span>Advanced visualizations</span>
            </li>
            
            <li className="flex items-start gap-2">
              {isPremium ? (
                <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
              )}
              <span>Team sharing capabilities</span>
            </li>
            
            <li className="flex items-start gap-2">
              {isPremium ? (
                <CheckCircle className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
              )}
              <span>Priority support</span>
            </li>
          </ul>
        </div>
      </CardContent>
      
      <CardFooter>
        {isPremium ? (
          <Button
            className="w-full bg-gradient-to-r from-green-600 to-green-700"
            disabled
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Premium Active
          </Button>
        ) : (
          <Button
            className="w-full purple-gradient"
            onClick={handleUpgradeClick}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Upgrade to Premium • $50/month
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default SubscriptionCard;
