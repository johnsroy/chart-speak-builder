
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Mail, Lock, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';

const ResetPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isResetMode, setIsResetMode] = useState(true);
  const { resetPassword, updatePassword, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if we have hash parameters from password reset email
    const hash = location.hash;
    if (hash && hash.includes('type=recovery')) {
      setIsResetMode(false); // Switch to update password mode
      
      // Extract hash parameters from URL
      const params = new URLSearchParams(hash.substring(1));
      
      // Automatically handle the recovery token
      const handleRecoveryToken = async () => {
        try {
          // Extract access_token from the URL hash if present
          const access_token = params.get('access_token');
          
          if (access_token) {
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token: access_token,
            });
            
            if (error) {
              setError('Invalid or expired recovery link. Please request a new password reset.');
              setIsResetMode(true); // Back to reset request mode on error
            } else {
              toast.success('Recovery link verified. Please set a new password.');
            }
          }
        } catch (error) {
          console.error('Error processing recovery token:', error);
          setError('Failed to process recovery link. Please request a new password reset.');
          setIsResetMode(true);
        }
      };
      
      handleRecoveryToken();
    }
  }, [location]);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await resetPassword(email);
      
      if (result.success) {
        setSuccess(`Password reset instructions have been sent to ${email}. Please check your inbox.`);
        toast.success('Password reset email sent');
      } else {
        setError(result.error || 'Failed to send reset instructions');
        toast.error('Password reset failed');
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred');
      toast.error('Password reset failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      if (newPassword !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      
      if (newPassword.length < 6) {
        setError('Password must be at least 6 characters long');
        return;
      }
      
      const result = await updatePassword(newPassword);
      
      if (result.success) {
        setSuccess('Password updated successfully');
        toast.success('Password has been reset');
        
        // Redirect to login after a short delay
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(result.error || 'Failed to update password');
        toast.error('Password update failed');
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred');
      toast.error('Password update failed');
    } finally {
      setIsLoading(false);
    }
  };

  // If user is authenticated and trying to reset password, redirect them to dashboard
  useEffect(() => {
    if (isAuthenticated && isResetMode) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, isResetMode, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-purple-900 to-blue-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button 
          variant="ghost" 
          className="text-white mb-4 hover:bg-white/10" 
          onClick={() => navigate('/login')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to login
        </Button>
        
        <Card className="w-full glass-card text-white border-purple-500/30">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-purple-700/30 rounded-full flex items-center justify-center backdrop-blur-md animate-pulse-custom">
                <RefreshCw className="h-8 w-8 text-purple-300" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">
              {isResetMode ? 'Reset Your Password' : 'Create New Password'}
            </CardTitle>
            <CardDescription className="text-gray-300 text-center">
              {isResetMode 
                ? "We'll send you instructions to reset your password" 
                : "Enter a new password for your account"}
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
          
          {success && (
            <CardContent className="pt-0">
              <Alert className="bg-green-900/40 border border-green-800 text-white">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            </CardContent>
          )}
          
          {isResetMode ? (
            <form onSubmit={handleResetRequest}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                    <Mail className="h-4 w-4 text-purple-400" />
                    Email Address
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
              </CardContent>
              
              <CardFooter className="flex flex-col gap-4">
                <Button
                  type="submit"
                  className="w-full purple-gradient"
                  disabled={isLoading || !!success}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending Instructions...
                    </>
                  ) : (
                    "Send Reset Instructions"
                  )}
                </Button>
                
                <div className="text-center text-sm">
                  Remember your password?{" "}
                  <a href="/login" className="text-purple-300 hover:text-white hover:underline">
                    Back to Login
                  </a>
                </div>
              </CardFooter>
            </form>
          ) : (
            <form onSubmit={handlePasswordUpdate}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="newPassword" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4 text-purple-400" />
                    New Password
                  </label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                    required
                    disabled={isLoading}
                    minLength={6}
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium flex items-center gap-2">
                    <Lock className="h-4 w-4 text-purple-400" />
                    Confirm Password
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="bg-white/10 border-white/20 text-white placeholder-gray-400"
                    required
                    disabled={isLoading}
                    minLength={6}
                  />
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col gap-4">
                <Button
                  type="submit"
                  className="w-full purple-gradient"
                  disabled={isLoading || !!success}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
