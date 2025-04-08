
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import SubscriptionCard from '@/components/subscription/SubscriptionCard';
import { CalendarClock, User, Mail, Key } from 'lucide-react';

const AccountPage = () => {
  const { user, subscription } = useAuth();

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="container max-w-6xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Account Settings</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card className="glass-card text-white border-purple-500/30 mb-8">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <User className="h-5 w-5 text-purple-400" />
                <div>
                  <h3 className="text-sm font-medium text-gray-400">User ID</h3>
                  <p className="text-sm text-gray-300">{user?.id}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-purple-400" />
                <div>
                  <h3 className="text-sm font-medium text-gray-400">Email Address</h3>
                  <p className="text-lg">{user?.email}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <CalendarClock className="h-5 w-5 text-purple-400" />
                <div>
                  <h3 className="text-sm font-medium text-gray-400">Account Created</h3>
                  <p className="text-sm text-gray-300">
                    {user?.created_at ? formatDate(user.created_at) : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {subscription?.isPremium && (
            <Card className="glass-card text-white border-purple-500/30">
              <CardHeader>
                <CardTitle>Billing Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-400">Plan</h3>
                    <p className="text-white">Premium ($50/month)</p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium text-gray-400">Billing Period</h3>
                    <p className="text-white">
                      {subscription.currentPeriodStart && subscription.currentPeriodEnd ? 
                        `${formatDate(subscription.currentPeriodStart)} - ${formatDate(subscription.currentPeriodEnd)}` : 
                        'N/A'}
                    </p>
                  </div>
                  
                  {subscription.cancelAtPeriodEnd && (
                    <div className="col-span-2 bg-red-900/20 p-3 rounded-md border border-red-500/20">
                      <h3 className="text-sm font-medium text-red-400">Subscription Status</h3>
                      <p className="text-gray-300">Your subscription has been canceled and will end on {formatDate(subscription.currentPeriodEnd)}.</p>
                    </div>
                  )}
                </div>

                <div className="pt-2 text-sm text-gray-400">
                  <p>For payment history and more detailed billing information, please contact support.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        <div>
          <SubscriptionCard />
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
