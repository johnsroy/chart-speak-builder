
import { 
  loginWithEmailPassword,
  signupWithEmailPassword,
  logout as authLogout,
  resendConfirmationEmail as authResendConfirmationEmail,
  resetPassword as authResetPassword,
  updatePassword as authUpdatePassword,
  adminLogin as authAdminLogin
} from '@/services/authService';

export function useAuthActions() {
  const login = async (email: string, password: string) => {
    return loginWithEmailPassword(email, password);
  };

  const signup = async (email: string, password: string) => {
    return signupWithEmailPassword(email, password);
  };
  
  const register = signup;

  const logout = async () => {
    await authLogout();
    return Promise.resolve();
  };

  const adminLogin = async () => {
    return authAdminLogin();
  };

  const resendConfirmationEmail = async (email: string) => {
    return authResendConfirmationEmail(email);
  };

  const resetPassword = async (email: string) => {
    return authResetPassword(email);
  };

  const updatePassword = async (newPassword: string) => {
    return authUpdatePassword(newPassword);
  };

  return {
    login,
    signup,
    register,
    logout,
    adminLogin,
    resendConfirmationEmail,
    resetPassword,
    updatePassword
  };
}
