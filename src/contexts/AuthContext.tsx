
import { createContext, useContext } from 'react';
import { AuthContextProps, AuthProviderProps } from '@/types/auth.types';
import { useAuthState } from '@/hooks/useAuthState';
import { useAuthActions } from '@/hooks/useAuthActions';
import { toast } from 'sonner';

// Create context with undefined default value
const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// Hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// AuthProvider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Combine state and actions
  const state = useAuthState();
  const actions = useAuthActions();
  
  // Combined auth context value
  const authContextValue: AuthContextProps = {
    ...state,
    ...actions
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};
