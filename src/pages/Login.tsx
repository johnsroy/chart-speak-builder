
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Logo from '@/components/Logo';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, register, adminLogin, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Redirect authenticated users
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/upload');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      if (isRegistering) {
        await register(email, password, name);
        toast({
          title: 'Account created!',
          description: 'Your account has been created successfully.',
        });
      } else {
        await login(email, password);
        toast({
          title: 'Welcome back!',
          description: 'You have been logged in successfully.',
        });
      }
      navigate('/upload');
    } catch (error) {
      toast({
        title: 'Authentication error',
        description: error instanceof Error ? error.message : 'Failed to authenticate',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    setIsLoading(true);
    
    try {
      // First try to set up the admin user via edge function
      const setupResponse = await fetch('https://rehadpogugijylybwmoe.supabase.co/functions/v1/admin-setup');
      console.log('Admin setup response:', await setupResponse.json());
      
      // Then attempt to login
      await adminLogin();
      toast({
        title: 'Admin access granted',
        description: 'You have been logged in as admin.',
      });
      navigate('/upload');
    } catch (error) {
      console.error('Admin login error:', error);
      toast({
        title: 'Admin login failed',
        description: error instanceof Error ? error.message : 'Failed to login as admin',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-purple-900 to-blue-900 text-white flex flex-col items-center justify-center p-4">
      <div className="glass-card w-full max-w-md p-8 rounded-xl">
        <div className="flex justify-center mb-6">
          <Logo />
        </div>
        
        <h1 className="text-2xl font-bold text-center mb-6">
          {isRegistering ? 'Create an Account' : 'Welcome Back'}
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div>
              <Label htmlFor="name" className="text-white">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-white/10 backdrop-blur-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
                placeholder="Enter your name"
                required={isRegistering}
                disabled={isLoading}
              />
            </div>
          )}
          
          <div>
            <Label htmlFor="email" className="text-white">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-white/10 backdrop-blur-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
              placeholder="Enter your email"
              required
              disabled={isLoading}
            />
          </div>
          
          <div>
            <Label htmlFor="password" className="text-white">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-white/10 backdrop-blur-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500 text-white"
              placeholder="Enter your password"
              required
              disabled={isLoading}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full purple-gradient"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : isRegistering ? 'Create Account' : 'Sign In'}
          </Button>
        </form>
        
        <div className="mt-6 text-center">
          <p>
            {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-purple-300 hover:text-white underline"
              disabled={isLoading}
            >
              {isRegistering ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
          
          <div className="mt-4 pt-4 border-t border-white/20">
            <Button
              variant="ghost"
              className="text-purple-300 hover:text-white"
              onClick={handleAdminLogin}
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Login as Admin (Testing Only)'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
