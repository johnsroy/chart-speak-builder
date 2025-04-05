
import { supabase } from '@/lib/supabase';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  name?: string;
}

export const adminCredentials = {
  email: 'admin@genbi.com',
  password: 'admin123!',
};

export const authService = {
  // Register a new user
  async register(email: string, password: string, name?: string) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: 'user',
          },
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  },

  // Log in an existing user
  async login(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  },

  // Admin bypass login (for development only)
  async adminLogin() {
    return this.login(adminCredentials.email, adminCredentials.password);
  },

  // Log out the current user
  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  },

  // Get the current user
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return null;
      
      return {
        id: data.user.id,
        email: data.user.email!,
        role: (data.user.user_metadata?.role as 'admin' | 'user') || 'user',
        name: data.user.user_metadata?.name,
      };
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },

  // Setup admin user (should be called once during initial setup)
  async setupAdminUser() {
    try {
      // Check if admin already exists
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', adminCredentials.email)
        .single();

      if (users) {
        console.log('Admin user already exists');
        return;
      }

      // Create admin user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: adminCredentials.email,
        password: adminCredentials.password,
        options: {
          data: {
            name: 'Admin User',
            role: 'admin',
          },
        },
      });

      if (signUpError) throw signUpError;
      console.log('Admin user created successfully');
      return data;
    } catch (error) {
      console.error('Error setting up admin user:', error);
      throw error;
    }
  },
};
