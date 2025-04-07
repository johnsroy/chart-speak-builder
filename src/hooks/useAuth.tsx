
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User } from '@/services/authService';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  adminLogin: () => Promise<{ user: User | null; session: Session | null } | void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // First, set up the auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log("Auth state changed:", event);
        setSession(currentSession);
        
        if (currentSession?.user) {
          // Use setTimeout to prevent deadlock with Supabase auth
          setTimeout(async () => {
            try {
              const currentUser = await authService.getCurrentUser();
              setUser(currentUser);
            } catch (error) {
              console.error('Error updating user after auth change:', error);
            } finally {
              setIsLoading(false);
            }
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );
    
    // Then check for an existing session
    const checkSession = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        setSession(currentSession);
        
        if (currentSession?.user) {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkSession();
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await authService.login(email, password);
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } finally {
      setIsLoading(false);
    }
  };
  
  const adminLogin = async () => {
    setIsLoading(true);
    try {
      console.log("Starting admin login process...");
      const result = await authService.adminLogin();
      console.log("Admin login completed:", result);
      
      if (result) {
        setSession(result.session);
        setUser(result.user);
        return result; // Important: Return the authentication result
      }
      
      // Fallback: try to get current user if session exists
      if (!user) {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      }
    } catch (error) {
      console.error("Admin login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  const register = async (email: string, password: string, name?: string) => {
    setIsLoading(true);
    try {
      await authService.register(email, password, name);
      // Auto login after registration
      await authService.login(email, password);
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } finally {
      setIsLoading(false);
    }
  };
  
  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      isAuthenticated: !!user && !!session,
      login,
      adminLogin,
      register,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
