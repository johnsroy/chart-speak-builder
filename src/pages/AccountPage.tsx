
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import SubscriptionCard from '@/components/subscription/SubscriptionCard';

const AccountPage = () => {
  const { user } = useAuth();

  return (
    <div className="container max-w-6xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Account Settings</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2">
          <Card className="glass-card text-white border-purple-500/30">
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-400">Email Address</h3>
                <p className="text-lg">{user?.email}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-400">Account ID</h3>
                <p className="text-sm text-gray-300">{user?.id}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-400">Account Created</h3>
                <p className="text-sm text-gray-300">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div>
          <SubscriptionCard />
        </div>
      </div>
    </div>
  );
};

export default AccountPage;
