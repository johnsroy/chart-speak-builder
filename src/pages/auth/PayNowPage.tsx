
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, CreditCard, Loader2, Mail, Shield, Zap } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';

const PayNowPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, login, signup, isAuthenticated } = useAuth();
  const [isNewUser, setIsNewUser] = useState(true);

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    
    if (emailError) setEmailError(null);
  };

  const handleCheckExistingUser = async () => {
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }

    try {
      // Check if user exists by trying to sign in with a dummy password
      const { data: userData, error: userError } = await supabase.auth.signInWithPassword({
        email,
        password: 'dummy-password-for-check'
      });

      // If this doesn't throw an error specifically about invalid login credentials,
      // it means the email doesn't exist
      if (userError && userError.message.includes('Invalid login credentials')) {
        setIsNewUser(true);
        return false;
      } else {
        setIsNewUser(false);
        return true;
      }
    } catch (error) {
      console.error("Error checking user:", error);
      return false;
    }
  };

  const handleUserRegistration = async () => {
    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    try {
      setIsLoading(true);

      if (isNewUser) {
        // Register the new user
        const result = await signup(email, password);
        if (!result.success) {
          setError(result.error || 'Failed to create account');
          return false;
        }
        toast.success('Account created successfully');
      } else {
        // Login existing user
        const result = await login(email, password);
        if (!result.success) {
          setError(result.error || 'Failed to log in');
          return false;
        }
        toast.success('Logged in successfully');
      }

      return true;
    } catch (error: any) {
      console.error("Registration error:", error);
      setError(error.message || 'An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setEmailError(null);

    try {
      // First check if user exists
      const userExists = await handleCheckExistingUser();

      // If new user or existing user that needs to log in
      if (!isAuthenticated) {
        if (!userExists && !password) {
          setError('Please create an account or sign in before proceeding with payment');
          setIsLoading(false);
          return;
        }

        // Register/login the user first
        const authSuccess = await handleUserRegistration();
        if (!authSuccess) {
          setIsLoading(false);
          return;
        }
      }

      console.log("Creating checkout session for:", user?.email || email);
      
      const isAdminTest = (user?.email || email) === 'admin@example.com';
      
      if (isAdminTest) {
        toast.info('Processing admin test payment...');
      } else {
        toast.info('Creating payment session...');
      }
      
      const { data, error: checkoutError } = await supabase.functions.invoke('create-checkout', {
        body: { 
          email: user?.email || email
        }
      });

      if (checkoutError) {
        console.error("Checkout error:", checkoutError);
        
        if (checkoutError.message?.includes('invalid')) {
          setEmailError('The email address format is not valid');
        } else {
          setError(checkoutError?.message || 'Failed to create payment session');
        }
        
        toast.error('Payment setup failed. Please try again.');
      } else if (!data?.url) {
        console.error("No URL returned");
        setError('Failed to create payment session. No checkout URL returned.');
        toast.error('Payment setup failed. Please try again.');
      } else {
        console.log("Redirecting to payment page");
        if (isAdminTest) {
          toast.success('Processing admin test payment');
        } else {
          toast.info('Redirecting to Stripe...');
        }
        
        window.top.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      
      if (error.message?.toLowerCase().includes('email')) {
        setEmailError(error.message || 'Please check your email address');
      } else {
        setError(error.message || 'An unexpected error occurred');
      }
      
      toast.error('Payment setup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
      setIsNewUser(false);
    }
  }, [user]);

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
                <CreditCard className="h-8 w-8 text-purple-300" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">
              Subscribe Now
            </CardTitle>
            <CardDescription className="text-gray-300 text-center">
              Get full access to GenBI Premium
            </CardDescription>
          </CardHeader>
          
          <form onSubmit={handlePaymentStart}>
            <CardContent className="space-y-4">
              {error && (
                <Alert className="bg-red-900/40 border border-red-800 text-white">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="bg-purple-900/30 border border-purple-500/20 rounded-lg p-4">
                <h3 className="font-bold text-lg mb-2">GenBI Premium - $50/month</h3>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                    <span>Unlimited datasets</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                    <span>Unlimited AI-powered queries</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                    <span>Advanced visualization tools</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                    <span>Priority support</span>
                  </li>
                </ul>
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
                  onChange={handleEmailChange}
                  placeholder="Enter your email"
                  className={`bg-white/10 border-white/20 text-white placeholder-gray-400 ${
                    emailError ? 'border-red-400' : ''
                  }`}
                  required
                  disabled={isLoading || !!user}
                />
                {emailError && (
                  <p className="text-red-400 text-sm mt-1">{emailError}</p>
                )}
              </div>
              
              {!isAuthenticated && (
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-400" />
                    Password {isNewUser ? '(Create a password)' : '(Your password)'}
                  </label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isNewUser ? "Create a password" : "Enter your password"}
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                    required={!isAuthenticated}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {isNewUser ? 'Required for new accounts' : 'Required to verify your identity'}
                  </p>
                </div>
              )}
              
              {email === 'admin@example.com' && (
                <Alert className="bg-yellow-900/30 border border-yellow-700/30">
                  <AlertDescription className="text-yellow-200">
                    Admin test mode detected. You'll be redirected to a test payment flow.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="flex items-center gap-3 pt-2 text-sm text-gray-300">
                <Shield className="h-4 w-4 text-purple-400" />
                <span>{isAuthenticated ? 'You will use your existing account' : (isNewUser ? 'A new account will be created' : 'You\'ll be signed in to your existing account')}</span>
              </div>
              
              {email === 'admin@example.com' && (
                <div className="bg-yellow-900/20 border border-yellow-700/20 rounded-lg p-3 text-sm">
                  <h4 className="font-medium mb-2">Test Card Information:</h4>
                  <ul className="space-y-1 text-gray-300">
                    <li>• Card: 4242 4242 4242 4242</li>
                    <li>• Expiry: Any future date (e.g. 12/34)</li>
                    <li>• CVC: Any 3 digits</li>
                  </ul>
                </div>
              )}
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
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Subscribe Now - $50/month
                  </>
                )}
              </Button>
              
              <div className="text-center text-sm">
                {isAuthenticated ? (
                  <div>
                    Using account <span className="font-medium">{user?.email}</span>
                  </div>
                ) : (
                  <>
                    {isNewUser ? 'Already have an account? ' : 'Don\'t have an account? '}
                    <button
                      type="button"
                      onClick={() => setIsNewUser(!isNewUser)}
                      className="text-purple-300 hover:text-white hover:underline"
                    >
                      {isNewUser ? 'Sign In' : 'Create Account'}
                    </button>
                  </>
                )}
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default PayNowPage;
