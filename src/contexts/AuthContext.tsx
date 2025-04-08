
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { UserSubscription } from '@/models/UserSubscription';
import { AuthContextProps, AuthProviderProps } from '@/types/auth.types';
import { 
  fetchUserSubscription,
  loginWithEmailPassword,
  signupWithEmailPassword,
  logout as authLogout,
  resendConfirmationEmail as authResendConfirmationEmail,
  resetPassword as authResetPassword,
  updatePassword as authUpdatePassword,
  adminLogin as authAdminLogin
} from '@/services/authService';
import { toast } from 'sonner';

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);

  useEffect(() => {
    console.log("Setting up auth state change listener");
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change event:", event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log("User signed in:", session.user.email);
        setUser(session.user);
        setSession(session);
        // Use setTimeout to avoid potential Supabase deadlocks when fetching additional data
        setTimeout(() => {
          fetchUserSubscription(session.user.id).then(sub => {
            if (sub) {
              console.log("User subscription loaded:", sub.isPremium ? "Premium" : "Free");
              setSubscription(sub);
            } else {
              // If no subscription found, create a default subscription object
              // This ensures all users can use features without being admin
              console.log("No subscription found, creating default subscription");
              setSubscription({
                userId: session.user.id,
                level: 'free',
                status: 'active',
                createdAt: new Date(),
                updatedAt: new Date(),
                isPremium: false,
                stripeCustomerId: null,
                stripeSubscriptionId: null,
                features: {
                  maxDatasets: 5,
                  maxQueries: 100,
                  aiAccess: true, // Enable AI access for all authenticated users
                  advancedVisualizations: true,
                  dataExport: true
                }
              });
            }
          }).catch(err => {
            console.error("Error fetching subscription:", err);
            // On error, still provide a default subscription
            setSubscription({
              userId: session.user.id,
              level: 'free',
              status: 'active',
              createdAt: new Date(),
              updatedAt: new Date(),
              isPremium: false,
              stripeCustomerId: null,
              stripeSubscriptionId: null,
              features: {
                maxDatasets: 5,
                maxQueries: 100,
                aiAccess: true, // Enable AI access for all authenticated users
                advancedVisualizations: true,
                dataExport: true
              }
            });
          });
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
        fetchUserSubscription(session.user.id).then(sub => {
          if (sub) {
            console.log("User subscription loaded:", sub.isPremium ? "Premium" : "Free");
            setSubscription(sub);
          } else {
            // If no subscription found, create a default subscription object
            console.log("No subscription found, creating default subscription");
            setSubscription({
              userId: session.user.id,
              level: 'free',
              status: 'active',
              createdAt: new Date(),
              updatedAt: new Date(),
              isPremium: false,
              stripeCustomerId: null,
              stripeSubscriptionId: null,
              features: {
                maxDatasets: 5,
                maxQueries: 100,
                aiAccess: true, // Enable AI access for all authenticated users
                advancedVisualizations: true,
                dataExport: true
              }
            });
          }
        }).catch(err => {
          console.error("Error fetching subscription:", err);
          // On error, still provide a default subscription
          setSubscription({
            userId: session.user.id,
            level: 'free',
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date(),
            isPremium: false,
            stripeCustomerId: null,
            stripeSubscriptionId: null,
            features: {
              maxDatasets: 5,
              maxQueries: 100,
              aiAccess: true, // Enable AI access for all authenticated users
              advancedVisualizations: true,
              dataExport: true
            }
          });
        });
      }
      setIsLoading(false);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    return loginWithEmailPassword(email, password);
  };

  const signup = async (email: string, password: string) => {
    return signupWithEmailPassword(email, password);
  };

  const logoutUser = async () => {
    return authLogout();
  };

  const resendConfirmation = async (email: string) => {
    return authResendConfirmationEmail(email);
  };

  const resetPasswordRequest = async (email: string) => {
    return authResetPassword(email);
  };

  const updateUserPassword = async (newPassword: string) => {
    return authUpdatePassword(newPassword);
  };

  const adminLoginHandler = async () => {
    return authAdminLogin();
  };

  const register = signup;

  // Modified to check for subscription status rather than just admin email
  const isAdmin = user?.email === 'admin@example.com' || (subscription?.isPremium === true);
  
  // All authenticated users can use AI features, not just admins
  const canUseAIFeatures = !!user && !!session;
  
  const isAuthenticated = !!user && !!session;

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      login, 
      signup, 
      logout: logoutUser, 
      adminLogin: adminLoginHandler, 
      isAuthenticated,
      isAdmin,
      register,
      session,
      subscription,
      resendConfirmationEmail: resendConfirmation,
      resetPassword: resetPasswordRequest,
      updatePassword: updateUserPassword,
      canUseAIFeatures // New property for feature access control
    }}>
      {children}
    </AuthContext.Provider>
  );
};
