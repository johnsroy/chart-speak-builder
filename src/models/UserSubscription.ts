
export interface UserSubscription {
  userId: string;
  status: string;
  isPremium: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  features: {
    maxDatasets: number;
    maxQueries: number;
    aiAccess: boolean;
    advancedVisualizations: boolean;
    dataExport: boolean;
  };
}
