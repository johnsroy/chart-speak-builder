
import React, { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from "sonner";

interface ProtectedRouteProps {
  children?: ReactNode;
  requireAdmin?: boolean;
}

const ProtectedRoute = ({ children, requireAdmin = false }: ProtectedRouteProps) => {
  const { isAuthenticated, isLoading, user, isAdmin } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
        <div className="p-8 rounded-xl text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    toast.error("Please log in to access this page");
    return <Navigate to="/login" replace />;
  }
  
  if (requireAdmin && !isAdmin) {
    toast.error("Admin permission required");
    return <Navigate to="/" replace />;
  }
  
  // Return either the children OR the Outlet
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
