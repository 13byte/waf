import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

const ProtectedRoute: React.FC = () => {
  const location = useLocation();
  const token = localStorage.getItem('auth_token');

  useEffect(() => {
    // Optional: Verify token validity with backend
    if (token) {
      // You could add token validation here
      fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).then(response => {
        if (response.status === 403 || response.status === 401) {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
      }).catch(() => {
        // Handle network errors
      });
    }
  }, [token]);

  if (!token) {
    // Redirect to login page but save the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;