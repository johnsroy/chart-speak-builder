
export interface UserSubscription {
  userId: string;
  status: string;
  isPremium: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  datasetsUsed?: number;
  queriesUsed?: number;
  datasetQuota?: number;
  queryQuota?: number;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  features: {
    maxDatasets: number;
    maxQueries: number;
    aiAccess: boolean;
    advancedVisualizations: boolean;
    dataExport: boolean;
  };
}

// Define the subscription tier limits
export const FREE_TIER_LIMITS = {
  datasets: 5,
  queries: 100,
  aiAccess: true,
  advancedVisualizations: false,
  dataExport: false
};

export const PREMIUM_TIER_LIMITS = {
  datasets: 50,
  queries: 1000,
  aiAccess: true,
  advancedVisualizations: true,
  dataExport: true
};
