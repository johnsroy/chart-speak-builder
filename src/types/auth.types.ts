
import { Session, User } from '@supabase/supabase-js';
import { UserSubscription } from '@/models/UserSubscription';

export interface AuthContextProps {
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

export interface AuthProviderProps {
  children: React.ReactNode;
}
