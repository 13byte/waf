import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@context/AuthContext';
import { ThemeProvider } from '@context/ThemeContext';
import ErrorBoundary from '@components/ErrorBoundary';
import { ProtectedRoute } from '@components/ProtectedRoute';

// Layout
import MainLayout from './presentation/layouts/MainLayout';

// Pages
import DashboardPage from './presentation/pages/DashboardPage';
import { SecurityEventsPage } from './presentation/pages/SecurityEventsPage';
import AttackLabPage from './presentation/pages/AttackLabPage';
import AnalyticsPage from './presentation/pages/AnalyticsPage';
import ConfigurationPage from './presentation/pages/ConfigurationPage';
import LoginPage from '@pages/LoginPage';
import RegisterPage from '@pages/RegisterPage';
import NotFoundPage from '@pages/errors/NotFoundPage';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Protected routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="security-events" element={<SecurityEventsPage />} />
              <Route path="attack-lab" element={<AttackLabPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="config" element={<ConfigurationPage />} />
            </Route>
          </Route>
          
          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default App;