
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { FREE_TIER_LIMITS, UserSubscription } from '@/models/UserSubscription';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  subscription: UserSubscription | null;
  canAddDataset: boolean;
  canRunQuery: boolean;
  incrementQueriesUsed: () => Promise<boolean>;
  incrementDatasetsUsed: () => Promise<boolean>;
}

interface AuthProviderProps {
  children: ReactNode;
  initialSession?: Session | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ 
  children, 
  initialSession 
}: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(initialSession?.user || null);
  const [session, setSession] = useState<Session | null>(initialSession || null);
  const [isLoading, setIsLoading] = useState(false);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const { toast } = useToast();

  const canAddDataset = subscription ? subscription.datasetsUsed < subscription.datasetQuota : false;
  const canRunQuery = subscription ? subscription.queriesUsed < subscription.queryQuota : false;

  // Fetch user subscription data
  const fetchSubscriptionData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('userId', userId)
        .single();

      if (error) {
        console.error('Error fetching subscription:', error);
        return;
      }

      if (data) {
        setSubscription({
          ...data,
          trialEndDate: data.trialEndDate ? new Date(data.trialEndDate) : null
        });
      } else {
        // Create default subscription for new user
        const defaultSubscription: UserSubscription = {
          userId,
          isPremium: false,
          datasetQuota: FREE_TIER_LIMITS.datasets,
          queryQuota: FREE_TIER_LIMITS.queries,
          datasetsUsed: 0,
          queriesUsed: 0,
          trialEndDate: null
        };

        const { error: insertError } = await supabase
          .from('user_subscriptions')
          .insert(defaultSubscription);

        if (insertError) {
          console.error('Error creating subscription:', insertError);
        } else {
          setSubscription(defaultSubscription);
        }
      }
    } catch (error) {
      console.error('Error in subscription handling:', error);
    }
  };

  // Increment datasets used
  const incrementDatasetsUsed = async (): Promise<boolean> => {
    if (!user || !subscription) return false;
    if (subscription.datasetsUsed >= subscription.datasetQuota) {
      toast({
        title: "Dataset limit reached",
        description: "Please upgrade your plan to add more datasets.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const newCount = subscription.datasetsUsed + 1;
      
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ datasetsUsed: newCount })
        .eq('userId', user.id);

      if (error) {
        console.error('Error updating datasets used:', error);
        return false;
      }

      setSubscription({
        ...subscription,
        datasetsUsed: newCount
      });
      return true;
    } catch (error) {
      console.error('Error incrementing datasets:', error);
      return false;
    }
  };

  // Increment queries used
  const incrementQueriesUsed = async (): Promise<boolean> => {
    if (!user || !subscription) return false;
    if (subscription.queriesUsed >= subscription.queryQuota) {
      toast({
        title: "Query limit reached",
        description: "Please upgrade your plan to run more queries.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const newCount = subscription.queriesUsed + 1;
      
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ queriesUsed: newCount })
        .eq('userId', user.id);

      if (error) {
        console.error('Error updating queries used:', error);
        return false;
      }

      setSubscription({
        ...subscription,
        queriesUsed: newCount
      });
      return true;
    } catch (error) {
      console.error('Error incrementing queries:', error);
      return false;
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user || null);
      
      if (newSession?.user) {
        fetchSubscriptionData(newSession.user.id);
      } else {
        setSubscription(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user || null);
      
      if (currentSession?.user) {
        fetchSubscriptionData(currentSession.user.id);
      }
    });

    return () => {
      authSubscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      setUser(data.user);
      setSession(data.session);
      toast({
        title: "Login successful",
        description: "Welcome back!",
      });
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) {
        throw error;
      }

      setUser(data.user);
      setSession(data.session);
      toast({
        title: "Registration successful",
        description: "Your account has been created",
      });
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      toast({
        title: "Logged out",
        description: "You have been logged out successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!user && !!session,
        signOut,
        login,
        register,
        subscription,
        canAddDataset,
        canRunQuery,
        incrementDatasetsUsed,
        incrementQueriesUsed
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
