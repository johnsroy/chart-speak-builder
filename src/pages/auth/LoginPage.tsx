
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Mail, Lock, Shield, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const LoginPage = () => {
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login, adminLogin, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Check for email in query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
      // If coming from payment success page, show toast
      if (location.state?.fromPayment) {
        toast.success("Your payment was successful! Please log in to access your premium features.");
      }
    }
  }, [location]);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      console.log("User is authenticated, redirecting to dashboard");
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await login(email, password);
      if (!result.success && result.error) {
        setError(result.error);
        toast.error('Login failed');
      } else {
        toast.success('Login successful!');
        
        // Check if this login is after a payment
        if (location.state?.fromPayment) {
          toast.success('Your premium features are now active!');
        }
        
        // Navigate to dashboard after successful login
        navigate('/dashboard', { replace: true });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to login');
      toast.error('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    setIsAdminLoading(true);
    setError(null);

    try {
      const result = await adminLogin();
      if (!result.success && result.error) {
        setError(result.error);
        toast.error('Admin login failed');
      } else {
        toast.success('Logged in as admin');
        // Navigate to dashboard after successful admin login
        navigate('/dashboard', { replace: true });
      }
    } catch (error: any) {
      console.error('Admin login error:', error);
      setError(error.message || 'Failed to login as admin');
      toast.error('Admin login failed');
    } finally {
      setIsAdminLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-purple-900 to-blue-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button 
          variant="ghost" 
          className="text-white mb-4 hover:bg-white/10" 
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to home
        </Button>
        
        <Card className="w-full glass-card text-white border-purple-500/30">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-purple-700/30 rounded-full flex items-center justify-center backdrop-blur-md">
                <Lock className="h-8 w-8 text-purple-300" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
            <CardDescription className="text-gray-300 text-center">
              Sign in to your GenBI account
            </CardDescription>
          </CardHeader>
          
          {error && (
            <CardContent className="pt-0">
              <Alert variant="destructive" className="bg-red-900/40 border border-red-800 text-white">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </CardContent>
          )}
          
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-purple-400" />
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                  required
                  disabled={isLoading}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4 text-purple-400" />
                    Password
                  </label>
                  <Link to="/reset-password" className="text-xs text-purple-300 hover:text-purple-200">
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                  required
                  disabled={isLoading}
                />
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col gap-4">
              <Button
                type="submit"
                className="w-full purple-gradient"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                onClick={handleAdminLogin}
                disabled={isAdminLoading || isLoading}
              >
                {isAdminLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="mr-2 h-4 w-4" />
                )}
                Sign In as Admin
              </Button>
              
              <div className="text-center text-sm">
                Don't have an account yet?{" "}
                <div className="flex flex-col sm:flex-row gap-2 justify-center mt-2">
                  <Link to="/signup" className="text-purple-300 hover:text-white hover:underline">
                    Start Free Trial
                  </Link>
                  <span className="hidden sm:inline">or</span>
                  <Link to="/pay-now" className="text-purple-300 hover:text-white hover:underline">
                    Subscribe Now
                  </Link>
                </div>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
