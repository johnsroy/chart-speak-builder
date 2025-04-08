
import { supabase } from '../lib/supabase';
import { UserSubscription } from '@/models/UserSubscription';
import { User } from '@supabase/supabase-js';

// Fetch user subscription data
export const fetchUserSubscription = async (userId: string): Promise<UserSubscription | null> => {
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('userId', userId)
      .single();

    if (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }

    if (data) {
      return {
        ...data,
        trialEndDate: data.trialEndDate ? new Date(data.trialEndDate) : null
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error in subscription handling:', error);
    return null;
  }
};

// Login with email and password
export const loginWithEmailPassword = async (email: string, password: string) => {
  try {
    console.log("Attempting login for:", email);
    
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    
    if (error) {
      console.error("Login error from Supabase:", error);
      return { success: false, error: error.message };
    }
    
    console.log("Login successful:", data.user?.email);
    return { success: true };
  } catch (error) {
    console.error('Login error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
};

// Sign up with email and password
export const signupWithEmailPassword = async (email: string, password: string) => {
  try {
    console.log("Attempting signup for:", email);
    
    // Check for existing users with this email
    const { data: existingUsers, error: checkError } = await supabase.auth.admin.listUsers();
    
    if (checkError) {
      console.error("Error checking existing users:", checkError);
    } else if (existingUsers) {
      // Fixed TypeScript error: Use optional chaining and type checking to safely access users
      const users = existingUsers.users || [];
      const userExists = users.some(user => user && user.email === email);
      
      if (userExists) {
        console.log("User already exists:", email);
        return { success: false, error: 'This email is already registered. Please try logging in instead.' };
      }
    }
    
    // Directly sign up - with autoconfirm since we're disabling email confirmation
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
    });
    
    if (error) {
      console.error("Signup error from Supabase:", error);
      
      // Check if the error is because user already exists
      if (error.message.includes('already registered')) {
        return { success: false, error: 'This email is already registered. Please try logging in instead.' };
      }
      
      return { success: false, error: error.message };
    }
    
    // Auto-login the user after signup since email confirmation is disabled
    if (data.user) {
      console.log("Signup successful, attempting auto-login");
      
      // Direct sign-in after signup
      const { error: signInError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      if (signInError) {
        console.error("Auto-login failed after signup:", signInError);
        return { success: true, error: "Account created, but you need to log in manually." };
      }
      
      console.log("Auto-login successful after signup");
    }
    
    console.log("Signup successful:", data.user?.email);
    return { success: true };
  } catch (error) {
    console.error('Signup error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
};

// Logout user
export const logout = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
};

// Resend confirmation email
export const resendConfirmationEmail = async (email: string) => {
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
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
};

// Reset password
export const resetPassword = async (email: string) => {
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
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
};

// Update password
export const updatePassword = async (newPassword: string) => {
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
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
};

// Admin login (for testing)
export const adminLogin = async () => {
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
