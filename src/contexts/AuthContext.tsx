
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
        fetchUserSubscription(session.user.id).then(sub => {
          if (sub) setSubscription(sub);
        });
      } else if (event === 'SIGNED_OUT') {
        console.log("User signed out");
        setUser(null);
        setSession(null);
        setSubscription(null);
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
          if (sub) setSubscription(sub);
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

  const isAdmin = user?.email === 'admin@example.com';
  
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
      updatePassword: updateUserPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};
