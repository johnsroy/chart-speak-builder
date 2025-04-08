import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';

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

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setSession(session);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setSession(null);
      }
      setIsLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        setSession(session);
      }
      setIsLoading(false);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred' };
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'An unknown error occurred' };
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
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
  
  const isAuthenticated = !!user;

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
      session
    }}>
      {children}
    </AuthContext.Provider>
  );
};
