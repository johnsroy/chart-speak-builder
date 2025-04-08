
export interface UserSubscription {
  userId: string;
  isPremium: boolean;
  datasetQuota: number;
  queryQuota: number;
  datasetsUsed: number;
  queriesUsed: number;
  trialEndDate: Date | null;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

export const FREE_TIER_LIMITS = {
  datasets: 2,
  queries: 10
};

export const PREMIUM_TIER_LIMITS = {
  datasets: 100,
  queries: 1000
};
