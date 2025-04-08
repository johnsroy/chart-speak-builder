
-- Create user_subscriptions table to track usage and limits
CREATE TABLE public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  userId UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  isPremium BOOLEAN NOT NULL DEFAULT false,
  datasetQuota INTEGER NOT NULL DEFAULT 2,
  queryQuota INTEGER NOT NULL DEFAULT 10,
  datasetsUsed INTEGER NOT NULL DEFAULT 0,
  queriesUsed INTEGER NOT NULL DEFAULT 0,
  trialEndDate TIMESTAMP WITH TIME ZONE,
  stripeCustomerId TEXT,
  stripeSubscriptionId TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow users to read only their own subscription
CREATE POLICY "Users can view their own subscription" 
  ON public.user_subscriptions 
  FOR SELECT 
  USING (auth.uid() = userId);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
