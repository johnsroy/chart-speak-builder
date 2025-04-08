
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

export const getSubscriptionTimeLeft = (subscription: UserSubscription | null): { days: number; isActive: boolean } => {
  if (!subscription) {
    return { days: 0, isActive: false };
  }

  // If premium and has current period end
  if (subscription.isPremium && subscription.currentPeriodEnd) {
    const endDate = new Date(subscription.currentPeriodEnd);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { days: diffDays, isActive: diffDays > 0 };
  }
  
  // If on trial
  if (subscription.trialEndDate) {
    const today = new Date();
    const trialEnd = new Date(subscription.trialEndDate);
    const diffTime = trialEnd.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { days: diffDays, isActive: diffDays > 0 };
  }

  // Not premium and no trial
  return { days: 0, isActive: false };
};

export const getSubscriptionStatus = (subscription: UserSubscription | null): string => {
  if (!subscription) return 'Not subscribed';
  
  const { days, isActive } = getSubscriptionTimeLeft(subscription);
  
  if (subscription.isPremium) {
    if (subscription.cancelAtPeriodEnd) {
      return `Premium (Cancels in ${days} days)`;
    } else {
      return 'Premium';
    }
  } else if (subscription.trialEndDate && isActive) {
    return `Trial (${days} days left)`;
  } else {
    return 'Free tier';
  }
};
