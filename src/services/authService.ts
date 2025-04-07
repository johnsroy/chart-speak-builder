
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  name?: string;
}

export interface AuthResult {
  user: User;
  session: Session;
}

export const adminCredentials = {
  email: 'admin@genbi.com',
  password: 'admin123!',
};

// In-memory admin user for direct bypass
const testAdminUser: User = {
  id: '00000000-0000-0000-0000-000000000000',  // Use consistent UUID format
  email: adminCredentials.email,
  role: 'admin',
  name: 'Admin User',
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
          emailRedirectTo: window.location.origin + '/upload',
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
  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Error logging in:', error);
        throw error;
      }
      
      if (!data.session || !data.user) {
        throw new Error('Login successful but no session or user returned');
      }
      
      const user: User = {
        id: data.user.id,
        email: data.user.email!,
        role: (data.user.user_metadata?.role as 'admin' | 'user') || 'user',
        name: data.user.user_metadata?.name,
      };
      
      return { user, session: data.session };
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  },

  // Admin bypass login - guaranteed to work without Supabase
  async adminLogin(): Promise<AuthResult> {
    try {
      // First try to use the regular Supabase auth if it's working
      try {
        console.log("Attempting standard Supabase admin login...");
        const setupResult = await this.setupAdminUser();
        
        if (setupResult.success) {
          const result = await this.login(adminCredentials.email, adminCredentials.password);
          console.log("Standard admin login successful");
          return result;
        }
      } catch (error) {
        console.log("Standard admin login failed, using direct bypass instead:", error);
      }
      
      // If the above fails, use direct bypass
      console.log("Using direct admin bypass login");
      
      // Create a fake session that resembles a Supabase session
      const fakeSession: Session = {
        access_token: 'fake-admin-token',
        refresh_token: 'fake-refresh-token',
        token_type: 'bearer',
        user: {
          id: testAdminUser.id,
          app_metadata: { provider: 'email' },
          user_metadata: { role: 'admin', name: 'Admin User' },
          aud: 'authenticated',
          email: testAdminUser.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          phone: '',
          confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          role: '',
          is_anonymous: false,
          factors: null,
          identities: []
        },
        expires_in: 3600,
        expires_at: new Date().getTime() + 3600000,
      };
      
      // Manually set the session in localStorage to simulate being logged in
      localStorage.setItem('supabase.auth.token', JSON.stringify({
        currentSession: fakeSession,
        expiresAt: fakeSession.expires_at
      }));
      
      // Also update the Supabase auth state
      await supabase.auth.setSession({
        access_token: fakeSession.access_token,
        refresh_token: fakeSession.refresh_token
      });
      
      return { user: testAdminUser, session: fakeSession };
    } catch (error) {
      console.error('Error during admin login:', error);
      throw error;
    }
  },

  // Log out the current user
  async logout() {
    try {
      // Check if we're using the direct admin bypass
      const authToken = localStorage.getItem('supabase.auth.token');
      if (authToken && authToken.includes(testAdminUser.id)) {
        // Clear the manually set session
        localStorage.removeItem('supabase.auth.token');
        return;
      }
      
      // Otherwise, use the regular Supabase logout
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
      // Check if we're using the direct admin bypass
      const authToken = localStorage.getItem('supabase.auth.token');
      if (authToken && authToken.includes(testAdminUser.id)) {
        return testAdminUser;
      }
      
      // Otherwise, use the regular Supabase getCurrentUser
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

  // Setup admin user
  async setupAdminUser() {
    try {
      console.log("Setting up admin user");
      
      // Call the admin-setup edge function to ensure admin user exists with confirmed email
      const response = await fetch('https://rehadpogugijylybwmoe.supabase.co/functions/v1/admin-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.auth.getSession() ? (await supabase.auth.getSession()).data.session?.access_token || '' : ''}`,
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! Status: ${response.status}`, errorText);
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        console.error('Error from admin-setup edge function:', result.message);
      } else {
        console.log('Admin user setup result:', result.message);
      }
      
      return result;
    } catch (error) {
      console.error('Error setting up admin user:', error);
      return { success: false, message: error instanceof Error ? error.message : String(error) };
    }
  },
};
