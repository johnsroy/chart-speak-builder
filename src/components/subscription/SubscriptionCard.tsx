
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { FREE_TIER_LIMITS, PREMIUM_TIER_LIMITS } from '@/models/UserSubscription';
import { Loader2, CheckCircle, XCircle, CreditCard, Calendar, InfoIcon, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const SubscriptionCard = () => {
  const { user, subscription } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const isPremium = subscription?.isPremium || false;
  const datasetsUsed = subscription?.datasetsUsed || 0;
  const queriesUsed = subscription?.queriesUsed || 0;
  const datasetQuota = subscription?.datasetQuota || FREE_TIER_LIMITS.datasets;
  const queryQuota = subscription?.queryQuota || FREE_TIER_LIMITS.queries;
  
  const datasetPercentage = Math.min(Math.round((datasetsUsed / datasetQuota) * 100), 100);
  const queryPercentage = Math.min(Math.round((queriesUsed / queryQuota) * 100), 100);
  
  // Format subscription details
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

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
      
      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to start checkout process. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user || !subscription?.stripeSubscriptionId) {
      toast.error('No subscription found to cancel');
      return;
    }

    setIsCancelling(true);
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        method: 'POST',
        body: { subscriptionId: subscription.stripeSubscriptionId }
      });

      if (error) throw error;

      if (data.success) {
        toast.success('Your subscription has been canceled successfully');
        setCancelDialogOpen(false);
        
        // This will update at the end of the current period, but we can update the UI to reflect the pending cancellation
        toast.info('Your premium features will remain active until the end of the current billing period');
      } else {
        toast.error(data.message || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error('Failed to cancel subscription. Please try again or contact support.');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <>
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
          {/* Usage metrics */}
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
          
          {/* Subscription details */}
          {isPremium && subscription?.stripeSubscriptionId && (
            <div className="space-y-3 py-3 px-4 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-purple-400" />
                <span className="text-gray-300">Next billing date:</span>
                <span>{formatDate(subscription.currentPeriodEnd)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="h-4 w-4 text-purple-400" />
                <span className="text-gray-300">Subscription ID:</span>
                <span className="text-xs">{subscription.stripeSubscriptionId.substring(0, 14)}...</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <InfoIcon className="h-4 w-4 text-purple-400" />
                <span className="text-gray-300">Plan:</span>
                <span>Premium ($50/month)</span>
              </div>
            </div>
          )}
          
          {/* Plan features list */}
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
        
        <CardFooter className="flex flex-col gap-2">
          {isPremium ? (
            <>
              <Button
                className="w-full bg-gradient-to-r from-green-600 to-green-700"
                disabled
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Premium Active
              </Button>
              <Button
                className="w-full bg-gray-600 hover:bg-gray-700 text-white"
                onClick={() => setCancelDialogOpen(true)}
                variant="outline"
              >
                Cancel Subscription
              </Button>
            </>
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

      {/* Cancel Subscription Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="glass-card text-white border-red-500/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Cancel Subscription
            </DialogTitle>
            <DialogDescription className="text-gray-300">
              Are you sure you want to cancel your premium subscription?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-300">
              If you cancel, your premium features will remain active until the end of your current billing period. After that, your account will be downgraded to the free plan.
            </p>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setCancelDialogOpen(false)}
              className="border-gray-600"
            >
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={isCancelling}
              className="bg-red-600 hover:bg-red-700"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Cancellation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SubscriptionCard;
