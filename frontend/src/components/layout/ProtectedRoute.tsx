import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    if (user.role === 'PARENT') {
      return <Navigate to="/parent/dashboard" replace />;
    }
    if (user.role === 'HEALTH_WORKER' || user.role === 'ADMIN') {
      return <Navigate to="/agent/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
