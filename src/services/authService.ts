
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
    try {
      // First check if the admin user exists, if not create it
      await this.setupAdminUser();
      
      // Then attempt to login with admin credentials
      return this.login(adminCredentials.email, adminCredentials.password);
    } catch (error) {
      console.error('Error during admin login:', error);
      throw error;
    }
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
      console.log("Setting up admin user");
      
      // Call the admin-setup edge function to ensure admin user exists
      const response = await fetch('https://rehadpogugijylybwmoe.supabase.co/functions/v1/admin-setup');
      const result = await response.json();
      
      if (!result.success) {
        console.error('Error from admin-setup edge function:', result.message);
      } else {
        console.log('Admin user created successfully');
      }
    } catch (error) {
      console.error('Error setting up admin user:', error);
    }
  },
};
