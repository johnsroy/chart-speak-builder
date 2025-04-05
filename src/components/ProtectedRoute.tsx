
import { ReactNode, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from "sonner";

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, user, session } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    // Show toast when authentication fails after loading completes
    if (!isLoading && !isAuthenticated) {
      toast.error("Please log in to access this page");
    }
    
    // Show toast when admin permission is required but user is not an admin
    if (!isLoading && isAuthenticated && requireAdmin && user?.role !== 'admin') {
      toast.error("Admin permission required");
    }
  }, [isLoading, isAuthenticated, user, requireAdmin]);
  
  if (isLoading) {
    // Show loading state
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-950 via-purple-900 to-blue-900">
        <div className="glass-card p-8 rounded-xl text-white text-center">
          <div className="animate-pulse">Loading...</div>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated || !session) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }
  
  if (requireAdmin && user?.role !== 'admin') {
    // Redirect to dashboard if admin access is required but user is not an admin
    return <Navigate to="/" replace />;
  }
  
  // Render children if all conditions are met
  return <>{children}</>;
};

export default ProtectedRoute;
