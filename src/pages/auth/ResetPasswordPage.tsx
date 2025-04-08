
import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, Mail, KeyRound, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || null;
  
  // Email input state for requesting password reset
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // New password state for setting new password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordResetComplete, setPasswordResetComplete] = useState(false);

  // Handle requesting a password reset link
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setSubmitted(true);
      toast.success('Password reset link sent to your email');
    } catch (error: any) {
      setError(error.message || 'Failed to send reset link');
      toast.error('Failed to send reset link');
      console.error('Reset password error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle setting a new password with reset token
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match");
      setIsLoading(false);
      return;
    }
    
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      setIsLoading(false);
      return;
    }
    
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      
      if (error) {
        throw error;
      }
      
      setPasswordResetComplete(true);
      toast.success('Password has been reset successfully');
    } catch (error: any) {
      setError(error.message || 'Failed to reset password');
      toast.error('Failed to reset password');
      console.error('Update password error:', error);
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
              <div className="w-16 h-16 bg-purple-700/30 rounded-full flex items-center justify-center backdrop-blur-md">
                {passwordResetComplete ? (
                  <CheckCircle className="h-8 w-8 text-green-300" />
                ) : token ? (
                  <KeyRound className="h-8 w-8 text-purple-300" />
                ) : (
                  <Mail className="h-8 w-8 text-purple-300" />
                )}
              </div>
            </div>
            <CardTitle className="text-2xl text-center">
              {passwordResetComplete 
                ? 'Password Reset Complete' 
                : token 
                  ? 'Set New Password' 
                  : 'Reset Password'}
            </CardTitle>
            <CardDescription className="text-gray-300 text-center">
              {passwordResetComplete 
                ? 'Your password has been updated successfully'
                : token 
                  ? 'Enter your new password below'
                  : 'Enter your email to receive a password reset link'}
            </CardDescription>
          </CardHeader>
          
          {error && (
            <CardContent className="pt-0">
              <Alert variant="destructive" className="bg-red-900/40 border border-red-800 text-white">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </CardContent>
          )}
          
          {passwordResetComplete ? (
            <CardContent className="space-y-4 text-center">
              <CheckCircle className="h-16 w-16 mx-auto text-green-400" />
              <p>Your password has been reset successfully.</p>
              <Button 
                onClick={() => navigate('/login')} 
                className="w-full purple-gradient mt-4"
              >
                Sign In with New Password
              </Button>
            </CardContent>
          ) : token ? (
            <form onSubmit={handleSetNewPassword}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="newPassword" className="text-sm font-medium">New Password</label>
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
                  <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
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
                      Updating Password...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </CardFooter>
            </form>
          ) : !submitted ? (
            <form onSubmit={handleRequestReset}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">Email</label>
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
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
                <div className="text-center text-sm">
                  Remember your password? <a href="/login" className="text-blue-500 hover:underline">Login</a>
                </div>
              </CardFooter>
            </form>
          ) : (
            <CardContent className="space-y-4 text-center">
              <p>Password reset link has been sent to your email. Please check your inbox.</p>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/login'} 
                className="mt-4 border-purple-500/30 hover:bg-purple-500/20 text-white"
              >
                Return to Login
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
