import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types';
import { Skeleton } from '@/components/ui';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, role, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-10 w-48 mx-auto" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  // Not authenticated -> redirect to login preserving redirect intent
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role authorization check
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // If a customer attempts to access admin/staff routes, redirect directly to portal
    if (role === 'customer') {
      return <Navigate to="/portal" replace />;
    }
    // If staff tries to access admin-only settings, redirect to dashboard
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

