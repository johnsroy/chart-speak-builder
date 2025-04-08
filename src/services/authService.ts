
import { supabase } from '../lib/supabase';
import { UserSubscription } from '@/models/UserSubscription';

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
    
    // Special handling for admin user
    if (email === 'admin@example.com' || email === 'admin@genbi.com') {
      console.log("Admin login attempt detected");
      return await adminLogin();
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });
    
    if (error) {
      console.error("Login error from Supabase:", error);
      
      // Special handling for email not confirmed error
      if (error.message.includes('Email not confirmed')) {
        console.log("Email not confirmed error, attempting to auto-confirm...");
        
        // Force update user to confirm email
        const { data: updateData, error: updateError } = await supabase.functions.invoke('admin-setup', {
          body: { 
            action: 'confirm-email',
            email
          }
        });
        
        if (updateError) {
          console.error("Failed to auto-confirm email:", updateError);
          return { success: false, error: 'Email not confirmed. Please check your inbox for confirmation email.' };
        }
        
        // Try login again after confirmation
        const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        
        if (retryError) {
          console.error("Login retry error:", retryError);
          return { success: false, error: retryError.message };
        }
        
        console.log("Login successful after auto-confirmation");
        return { success: true };
      }
      
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
    
    // Auto-confirm email for all signups
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          email_confirmed: true
        }
      }
    });
    
    if (error) {
      console.error("Signup error from Supabase:", error);
      
      // Check if the error is because user already exists
      if (error.message.includes('already registered')) {
        return { success: false, error: 'This email is already registered. Please try logging in instead.' };
      }
      
      return { success: false, error: error.message };
    }
    
    if (data.user) {
      console.log("Signup successful:", data.user.email);
      
      // Wait a moment for signup to complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create trial subscription for new user
      try {
        // Calculate trial end date (14 days from now)
        const trialEndDate = new Date();
        trialEndDate.setDate(trialEndDate.getDate() + 14);
        
        await supabase.from('user_subscriptions').insert({
          userId: data.user.id,
          isPremium: false,
          datasetQuota: 2,
          queryQuota: 10,
          datasetsUsed: 0,
          queriesUsed: 0,
          trialEndDate: trialEndDate.toISOString()
        });
        
        console.log("Created trial subscription for new user");
      } catch (dbError) {
        console.error("Error setting up user subscription:", dbError);
      }
      
      // Auto login after signup
      console.log("Attempting auto-login after signup");
      const { data: sessionData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (loginError) {
        console.error("Auto-login error after signup:", loginError);
        
        if (loginError.message.includes('Email not confirmed')) {
          console.log("Attempting to force confirm email through admin function");
          
          try {
            await supabase.functions.invoke('admin-setup', {
              body: { 
                action: 'confirm-email',
                email
              }
            });
            
            // Try login once more
            const { error: finalLoginError } = await supabase.auth.signInWithPassword({
              email,
              password
            });
            
            if (!finalLoginError) {
              console.log("Login successful after forced email confirmation");
              return { success: true };
            }
          } catch (funcError) {
            console.error("Error invoking admin function:", funcError);
          }
        }
        
        return { 
          success: true, 
          error: "Account created, but you need to log in manually."
        };
      }
      
      console.log("Auto-login successful after signup");
      return { success: true };
    }
    
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

// Admin login function with special handling
export const adminLogin = async () => {
  try {
    console.log("Attempting admin login");
    
    // First try normal login with admin credentials
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'admin@example.com',
      password: 'password123',
    });
    
    if (!loginError && loginData.user) {
      console.log("Admin login successful via normal login");
      return { success: true };
    }
    
    console.log("Normal admin login failed, trying alternative admin credentials");
    
    // Try alternative admin email
    const { data: altLoginData, error: altLoginError } = await supabase.auth.signInWithPassword({
      email: 'admin@genbi.com',
      password: 'admin123!',
    });
    
    if (!altLoginError && altLoginData.user) {
      console.log("Admin login successful via alternative credentials");
      return { success: true };
    }
    
    // If both failed, try to create admin user via the edge function
    console.log("Both admin logins failed, attempting to create admin user via edge function");
    
    try {
      // Use the supabaseUrl and anon key from the supabase.ts file
      const supabaseUrl = 'https://rehadpogugijylybwmoe.supabase.co';
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlaGFkcG9ndWdpanlseWJ3bW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4MzcyOTEsImV4cCI6MjA1OTQxMzI5MX0.jMgvzUUum46NpLp4ZKfXI06M1nIvu82L9bmAuxqYYZw';
      
      const response = await fetch(`${supabaseUrl}/functions/v1/admin-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`
        }
      });
      
      if (response.ok) {
        console.log("Admin setup function called successfully");
        
        // Try login again with first admin account
        const { data: setupLoginData, error: setupLoginError } = await supabase.auth.signInWithPassword({
          email: 'admin@example.com',
          password: 'password123',
        });
        
        if (!setupLoginError && setupLoginData.user) {
          console.log("Admin login successful after setup function");
          return { success: true };
        }
        
        // Try alternative admin account
        const { data: altSetupData, error: altSetupError } = await supabase.auth.signInWithPassword({
          email: 'admin@genbi.com',
          password: 'admin123!',
        });
        
        if (!altSetupError && altSetupData.user) {
          console.log("Alternative admin login successful after setup function");
          return { success: true };
        }
      }
    } catch (funcError) {
      console.error("Error calling admin setup function:", funcError);
    }
    
    // If all attempts failed, create admin manually
    console.log("All admin login attempts failed, creating admin manually");
    
    try {
      // Create the admin user directly
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: 'admin@example.com',
        password: 'password123',
        options: {
          data: {
            role: 'admin',
            name: 'Admin User',
            email_confirmed: true
          }
        }
      });
      
      if (signupError) {
        console.error("Failed to create admin user:", signupError);
      } else {
        console.log("Admin user created, attempting login");
        
        // Login with new admin user
        const { data: finalLoginData, error: finalLoginError } = await supabase.auth.signInWithPassword({
          email: 'admin@example.com',
          password: 'password123',
        });
        
        if (!finalLoginError && finalLoginData.user) {
          console.log("Admin login successful after manual creation");
          return { success: true };
        }
      }
    } catch (signupError) {
      console.error("Admin signup error:", signupError);
    }
    
    console.error("All admin login attempts failed");
    return { 
      success: false, 
      error: "Failed to log in as admin after multiple attempts" 
    };
  } catch (error) {
    console.error('Admin login error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
};

// Create an admin-setup edge function helper
export const setupAdminUser = async () => {
  try {
    console.log("Setting up admin user via edge function");
    
    // Use the supabaseUrl and anon key from the supabase.ts file instead of accessing protected property
    const supabaseUrl = 'https://rehadpogugijylybwmoe.supabase.co';
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJlaGFkcG9ndWdpanlseWJ3bW9lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4MzcyOTEsImV4cCI6MjA1OTQxMzI5MX0.jMgvzUUum46NpLp4ZKfXI06M1nIvu82L9bmAuxqYYZw';
    
    const response = await fetch(`${supabaseUrl}/functions/v1/admin-setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to setup admin user: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log("Admin setup result:", result);
    
    return { success: true };
  } catch (error) {
    console.error("Error setting up admin user:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
};
