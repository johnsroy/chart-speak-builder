
import { Session, User } from '@supabase/supabase-js';
import { UserSubscription } from '@/models/UserSubscription';

export interface AuthContextProps {
  user: User | null;
  session: Session | null;
  subscription: UserSubscription | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  canUseAIFeatures: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  adminLogin: () => Promise<{ success: boolean; error?: string }>;
  resendConfirmationEmail: (email: string) => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  updatePassword: (password: string) => Promise<{ success: boolean; error?: string }>;
}

export interface AuthProviderProps {
  children: React.ReactNode;
}
