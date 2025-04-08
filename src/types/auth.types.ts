
import { Session, User } from '@supabase/supabase-js';
import { UserSubscription } from '@/models/UserSubscription';

export interface AuthContextProps {
  user: User | null;
  session: Session | null;
  subscription: UserSubscription | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  canUseAIFeatures: boolean; // Added this property
  login: (email: string, password: string) => Promise<{ user: User | null; error: Error | null }>;
  signup: (email: string, password: string) => Promise<{ user: User | null; error: Error | null }>;
  register: (email: string, password: string) => Promise<{ user: User | null; error: Error | null }>;
  logout: () => Promise<void>;
  adminLogin: () => Promise<{ user: User | null; error: Error | null }>;
  resendConfirmationEmail: (email: string) => Promise<{ data: any | null; error: Error | null }>;
  resetPassword: (email: string) => Promise<{ data: any | null; error: Error | null }>;
  updatePassword: (password: string) => Promise<{ data: any | null; error: Error | null }>;
}

export interface AuthProviderProps {
  children: React.ReactNode;
}
