
-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  isPremium BOOLEAN NOT NULL DEFAULT FALSE,
  datasetQuota INTEGER NOT NULL DEFAULT 2,
  queryQuota INTEGER NOT NULL DEFAULT 10,
  datasetsUsed INTEGER NOT NULL DEFAULT 0,
  queriesUsed INTEGER NOT NULL DEFAULT 0,
  trialEndDate TIMESTAMP WITH TIME ZONE,
  stripeCustomerId TEXT,
  stripeSubscriptionId TEXT,
  currentPeriodStart TIMESTAMP WITH TIME ZONE,
  currentPeriodEnd TIMESTAMP WITH TIME ZONE,
  cancelAtPeriodEnd BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add RLS policies for user_subscriptions
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own subscription data
CREATE POLICY "Users can view their own subscription data" 
  ON public.user_subscriptions 
  FOR SELECT 
  USING (auth.uid() = userId);

-- Allow users to update their own subscription data
CREATE POLICY "Users can update their own subscription data" 
  ON public.user_subscriptions 
  FOR UPDATE 
  USING (auth.uid() = userId);

-- Allow the service role and authenticated users to insert subscription data
CREATE POLICY "Service role can insert subscription data" 
  ON public.user_subscriptions 
  FOR INSERT 
  WITH CHECK (true);

-- Create an index for faster lookups by userId
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(userId);

-- Create an index for faster lookups by stripeCustomerId
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_stripe_customer_id ON public.user_subscriptions(stripeCustomerId);
