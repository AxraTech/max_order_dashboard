import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && user && allowedRoles && !allowedRoles.includes(user.role.name)) {
      logout();
    }
  }, [isAuthenticated, user, allowedRoles, logout]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-color)' }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48, color: 'var(--primary-color)' }} spin />} />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    const isUnauthorized = isAuthenticated && user && allowedRoles && !allowedRoles.includes(user.role.name);
    return <Navigate to={`/login${isUnauthorized ? '?unauthorized=true' : ''}`} state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role.name)) {
    return <Navigate to="/login?unauthorized=true" replace />;
  }

  return <Outlet />;
};
