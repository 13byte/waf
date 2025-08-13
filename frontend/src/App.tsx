import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@context/AuthContext';
import ErrorBoundary from '@components/ErrorBoundary';

// Layout
import { MainLayout } from './presentation/layouts/MainLayout';

// Pages
import { DashboardPage } from './presentation/pages/DashboardPage';
import { SecurityEventsPage } from './presentation/pages/SecurityEventsPage';
import { AttackLabPage } from './presentation/pages/AttackLabPage';
import { AnalyticsPage } from './presentation/pages/AnalyticsPage';
import { ConfigurationPage } from './presentation/pages/ConfigurationPage';
import LoginPage from '@pages/LoginPage';
import NotFoundPage from '@pages/errors/NotFoundPage';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected routes with new layout */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="security-events" element={<SecurityEventsPage />} />
            <Route path="attack-lab" element={<AttackLabPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="config" element={<ConfigurationPage />} />
          </Route>
          
          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;