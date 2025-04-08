
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { UserSubscription } from '@/models/UserSubscription';
import { toast } from 'sonner';

interface AuthContextProps {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<{ success: boolean; error?: string }>;
  adminLogin: () => Promise<{ success: boolean; error?: string }>;
  isAuthenticated: boolean;
  isAdmin: boolean;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  session: Session | null;
  subscription: UserSubscription | null;
  resendConfirmationEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

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
      }
    } catch (error) {
      console.error('Error in subscription handling:', error);
    }
  };

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change event:", event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setSession(session);
        fetchSubscriptionData(session.user.id);
      } else if (event === 'SIGNED_OUT') {
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
        setUser(session.user);
        setSession(session);
        fetchSubscriptionData(session.user.id);
      }
      setIsLoading(false);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log("Attempting login for:", email);
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error("Login error from Supabase:", error);
        
        // Check for email confirmation error
        if (error.message.includes('Email not confirmed')) {
          return { success: false, error: 'Email not confirmed. Please check your inbox for a confirmation email.' };
        }
        
        return { success: false, error: error.message };
      }
      
      console.log("Login successful:", data.user?.email);
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred' };
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      // Check if user already exists
      const { data: existingUsers, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email);
      
      if (existingUsers && existingUsers.length > 0) {
        return { success: false, error: 'This email is already registered. Please try logging in instead.' };
      }
      
      // Check if user exists in auth.users (we can't query directly, but we can try to sign in)
      const { error: signInError } = await supabase.auth.signInWithPassword({ 
        email, 
        password: "dummy-password-for-check"  // We expect this to fail, we're just checking if the account exists
      });
      
      // If we get an invalid credentials error but not a user not found error, the user exists
      if (signInError && !signInError.message.includes('user not found') && 
          signInError.message.includes('Invalid login credentials')) {
        return { success: false, error: 'This email is already registered. Please try logging in instead.' };
      }
      
      console.log("Attempting signup for:", email);
      
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: window.location.origin + '/login'
        }
      });
      
      if (error) {
        console.error("Signup error from Supabase:", error);
        return { success: false, error: error.message };
      }
      
      // Check if email confirmation is required
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        return { success: false, error: 'This email is already registered. Try logging in instead.' };
      }
      
      console.log("Signup successful:", data.user?.email);
      return { success: true };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred' };
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred' };
    }
  };

  const resendConfirmationEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email
      });
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Resend confirmation email error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred' };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Password reset error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred' };
    }
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error) {
      console.error('Password update error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred' };
    }
  };

  const register = signup;

  const adminLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'admin@example.com',
        password: 'password123',
      });
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Admin login error:', error);
      try {
        await supabase.auth.signUp({
          email: 'admin@example.com',
          password: 'password123',
        });
        
        await supabase.auth.signInWithPassword({
          email: 'admin@example.com',
          password: 'password123',
        });
        
        return { success: true };
      } catch (signupError) {
        console.error('Admin signup error:', signupError);
        return { 
          success: false, 
          error: signupError instanceof Error ? signupError.message : 'An unknown error occurred' 
        };
      }
    }
  };

  const isAdmin = user?.email === 'admin@example.com';
  
  const isAuthenticated = !!user && !!session;

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      login, 
      signup, 
      logout, 
      adminLogin, 
      isAuthenticated,
      isAdmin,
      register,
      session,
      subscription,
      resendConfirmationEmail,
      resetPassword,
      updatePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};
