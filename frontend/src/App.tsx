import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@context/AuthContext';
import ErrorBoundary from '@components/ErrorBoundary';
import Header from '@components/Header';
import HomePage from '@pages/HomePage';
import LoginPage from '@pages/LoginPage';
import RegisterPage from '@pages/RegisterPage';
import PostsPage from '@pages/PostsPage';
import VulnerablePage from '@pages/VulnerablePage';
import ForbiddenPage from '@pages/errors/ForbiddenPage';
import NotFoundPage from '@pages/errors/NotFoundPage';
import ServerErrorPage from '@pages/errors/ServerErrorPage';
import PostDetailPage from '@pages/PostDetailPage';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/posts" element={<PostsPage />} />
              <Route path="/posts/:id" element={<PostDetailPage />} />
              <Route path="/vulnerable" element={<VulnerablePage />} />
              <Route path="/error/403" element={<ForbiddenPage />} />
              <Route path="/error/404" element={<NotFoundPage />} />
              <Route path="/error/500" element={<ServerErrorPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;