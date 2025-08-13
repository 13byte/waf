import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute: React.FC = () => {
  const { state } = useAuth();
  
  // Wait for initial auth check to complete
  if (!state.isInitialized || state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!state.user) {
    return <Navigate to="/login" replace />;
  }
  
  return <Outlet />;
};