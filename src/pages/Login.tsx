
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Logo from '@/components/Logo';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { login, register, adminLogin, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/upload');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
      if (isRegistering) {
        await register(email, password);
        setSuccessMessage("Account created! Please check your email to confirm your account.");
        toast({
          title: 'Account created!',
          description: 'Please check your email to confirm your account.',
        });
      } else {
        await login(email, password);
        toast({
          title: 'Welcome back!',
          description: 'You have been logged in successfully.',
        });
        navigate('/upload');
      }
    } catch (error) {
      let errorMsg = error instanceof Error ? error.message : 'Failed to authenticate';
      
      if (errorMsg.includes('Email not confirmed')) {
        errorMsg = 'Please confirm your email address before logging in. Check your inbox for a confirmation email.';
      } else if (errorMsg.includes('Invalid login credentials')) {
        errorMsg = 'Invalid email or password. Please try again.';
      } else if (errorMsg.includes('User already registered')) {
        errorMsg = 'This email is already registered. Try logging in instead.';
      }
      
      setErrorMessage(errorMsg);
      toast({
        title: 'Authentication error',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleAdminLogin = async () => {
    setAdminLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    
    try {
      toast({
        title: 'Admin login',
        description: 'Logging in with admin credentials...',
      });
      
      await adminLogin();
      
      toast({
        title: 'Admin access granted',
        description: 'You have been logged in as admin.',
      });
      
      navigate('/upload');
    } catch (error) {
      console.error('Admin login error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to login as admin';
      setErrorMessage(errorMsg);
      toast({
        title: 'Admin login failed',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setAdminLoading(false);
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
        
        {errorMessage && (
          <Alert variant="destructive" className="mb-4 bg-red-900/50 border border-red-700/50">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        
        {successMessage && (
          <Alert className="mb-4 bg-green-900/50 border border-green-700/50">
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}
        
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
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : isRegistering ? 'Create Account' : 'Sign In'}
          </Button>
        </form>
        
        <div className="mt-6 text-center">
          <p>
            {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setErrorMessage(null); 
                setSuccessMessage(null);
              }}
              className="text-purple-300 hover:text-white underline"
              disabled={isLoading}
            >
              {isRegistering ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
          
          <div className="mt-4 pt-4 border-t border-white/20">
            <Button
              variant="outline"
              className="w-full bg-purple-900/30 hover:bg-purple-800/50 text-white border-purple-600/50"
              onClick={handleAdminLogin}
              disabled={isLoading || adminLoading}
            >
              {adminLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in as admin...
                </>
              ) : 'Login as Admin (Test User)'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
