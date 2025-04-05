
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Logo from '@/components/Logo';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const { login, register, adminLogin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    }
  };

  const handleAdminLogin = async () => {
    try {
      await adminLogin();
      toast({
        title: 'Admin access granted',
        description: 'You have been logged in as admin.',
      });
      navigate('/upload');
    } catch (error) {
      toast({
        title: 'Admin login failed',
        description: error instanceof Error ? error.message : 'Failed to login as admin',
        variant: 'destructive',
      });
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
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-md border bg-white/10 backdrop-blur-sm border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Enter your name"
                required={isRegistering}
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-md border bg-white/10 backdrop-blur-sm border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-md border bg-white/10 backdrop-blur-sm border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Enter your password"
              required
            />
          </div>
          
          <Button type="submit" className="w-full purple-gradient">
            {isRegistering ? 'Create Account' : 'Sign In'}
          </Button>
        </form>
        
        <div className="mt-6 text-center">
          <p>
            {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-purple-300 hover:text-white underline"
            >
              {isRegistering ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
          
          <div className="mt-4 pt-4 border-t border-white/20">
            <Button
              variant="ghost"
              className="text-purple-300 hover:text-white"
              onClick={handleAdminLogin}
            >
              Login as Admin (Testing Only)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
