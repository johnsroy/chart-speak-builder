
import { useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserSubscription } from '@/models/UserSubscription';
import { fetchUserSubscription } from '@/services/authService';

export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);

  // Helper function to create default subscription
  const createDefaultSubscription = (userId: string): UserSubscription => {
    return {
      userId: userId,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
      isPremium: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      datasetsUsed: 0,
      queriesUsed: 0,
      datasetQuota: 5,
      queryQuota: 100,
      features: {
        maxDatasets: 5,
        maxQueries: 100,
        aiAccess: true,
        advancedVisualizations: true,
        dataExport: true
      }
    };
  };

  // Helper function to load user subscription
  const loadUserSubscription = async (userId: string) => {
    try {
      const sub = await fetchUserSubscription(userId);
      if (sub) {
        console.log("User subscription loaded:", sub.isPremium ? "Premium" : "Free");
        setSubscription(sub);
      } else {
        // If no subscription found, create a default subscription object
        console.log("No subscription found, creating default subscription");
        setSubscription(createDefaultSubscription(userId));
      }
    } catch (err) {
      console.error("Error fetching subscription:", err);
      // On error, still provide a default subscription
      setSubscription(createDefaultSubscription(userId));
    }
  };

  useEffect(() => {
    console.log("Setting up auth state change listener");
    
    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change event:", event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log("User signed in:", session.user.email);
        setUser(session.user);
        setSession(session);
        
        // Use setTimeout to avoid potential Supabase deadlocks when fetching additional data
        setTimeout(() => {
          loadUserSubscription(session.user.id);
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        console.log("User signed out");
        setUser(null);
        setSession(null);
        setSubscription(null);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log("Token refreshed for user:", session.user.email);
        setUser(session.user);
        setSession(session);
      }
      
      setIsLoading(false);
    });

    // Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session:", session ? "Present" : "Not present");
      
      if (session?.user) {
        console.log("Initial user:", session.user.email);
        setUser(session.user);
        setSession(session);
        
        loadUserSubscription(session.user.id);
      }
      
      setIsLoading(false);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Derived state
  const isAdmin = user?.email === 'admin@example.com' || (subscription?.isPremium === true);
  const canUseAIFeatures = !!user && !!session;
  const isAuthenticated = !!user && !!session;

  return {
    user,
    session,
    isLoading,
    subscription,
    isAuthenticated,
    isAdmin,
    canUseAIFeatures
  };
}
