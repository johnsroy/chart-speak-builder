import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, User, Mail, Lock, CheckCircle, AlertTriangle, CreditCard, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const SignupPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signup, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      console.log("User is authenticated, redirecting to dashboard");
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      console.log("Signup form submitted for:", email);
      const result = await signup(email, password);
      
      if (result.success) {
        console.log("Signup successful, redirecting to dashboard");
        toast.success('Account created successfully! You now have a 1-day trial.');
        setRegistrationComplete(true);
      } else if (result.error) {
        console.error("Signup error:", result.error);
        setError(result.error);
        toast.error('Registration failed');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      setError(error.message || 'Failed to register');
      toast.error('Registration failed');
    } finally {
      setIsLoading(false);
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
              <div className="w-16 h-16 bg-purple-700/30 rounded-full flex items-center justify-center backdrop-blur-md animate-pulse-custom">
                {registrationComplete ? (
                  <CheckCircle className="h-8 w-8 text-green-300" />
                ) : (
                  <User className="h-8 w-8 text-purple-300" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl text-center">
              {registrationComplete ? 'Registration Complete!' : 'Create your account'}
            </CardTitle>
            <CardDescription className="text-gray-300 text-center">
              {registrationComplete 
                ? 'You will be redirected to the dashboard' 
                : 'Join GenBI with a 1-day free trial'}
            </CardDescription>
          </CardHeader>
          
          <div className="px-6 pt-0 pb-2">
            <div className="flex justify-center space-x-6 border-b border-purple-500/20 pb-4">
              <Link to="/signup" className="text-white font-medium pb-2 border-b-2 border-purple-500">
                1-Day Free Trial
              </Link>
              <Link to="/pay-now" className="text-gray-300 hover:text-white pb-2 border-b-2 border-transparent hover:border-purple-300">
                <div className="flex items-center">
                  <CreditCard className="h-4 w-4 mr-1" />
                  Pay Now
                </div>
              </Link>
            </div>
          </div>
          
          {error && (
            <CardContent className="pt-0">
              <Alert variant="destructive" className="bg-red-900/40 border border-red-800 text-white">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {error}
                  {error.includes('already registered') && (
                    <div className="mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-white hover:text-white hover:bg-purple-500/30"
                        onClick={() => navigate('/login')}
                      >
                        Go to Login
                      </Button>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            </CardContent>
          )}
          
          {!registrationComplete ? (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-purple-400" />
                    Name
                  </label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                    required
                    disabled={isLoading}
                  />
                </div>
                
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
                  <label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4 text-purple-400" />
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                    required
                    disabled={isLoading}
                    minLength={6}
                  />
                </div>
                
                <div className="pt-2">
                  <div className="bg-purple-900/30 border border-purple-500/20 rounded-lg p-4">
                    <h3 className="font-medium text-sm mb-2 flex items-center">
                      <Clock className="h-4 w-4 text-purple-400 mr-1" />
                      Your 1-day trial includes:
                    </h3>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span>2 free datasets</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span>10 free AI-powered queries</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span>No credit card required</span>
                      </li>
                    </ul>
                  </div>
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
                      Creating Account...
                    </>
                  ) : (
                    "Start My Free Trial"
                  )}
                </Button>
                
                <div className="text-center text-sm">
                  Already have an account?{" "}
                  <a href="/login" className="text-purple-300 hover:text-white hover:underline">
                    Sign In
                  </a>
                </div>
              </CardFooter>
            </form>
          ) : (
            <CardContent className="space-y-6 text-center py-6">
              <div className="bg-green-900/20 rounded-full p-4 w-24 h-24 mx-auto flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-green-400" />
              </div>
              
              <div className="space-y-3">
                <h3 className="text-xl font-medium">Success!</h3>
                <p className="text-gray-300">
                  Your account has been created successfully.
                </p>
                <p className="text-gray-300">
                  You will be redirected to the dashboard automatically.
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default SignupPage;
