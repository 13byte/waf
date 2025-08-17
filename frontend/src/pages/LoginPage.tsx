import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '@context/AuthContext';
import { oauthConfig } from '@/config/oauth';

const LoginPage: React.FC = () => {
  const { state, login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const result = await login(formData);
    
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Login failed');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      console.log('Google OAuth response:', credentialResponse);
      
      if (!credentialResponse.credential) {
        console.error('No credential in response');
        setError('Invalid Google response');
        return;
      }
      
      // Send Google token to backend
      const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: credentialResponse.credential
        })
      });

      const data = await response.json();
      console.log('Backend response:', data);

      if (response.ok && data.access_token) {
        // Store token and user info
        localStorage.setItem('auth_token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/');
      } else {
        setError(data.detail || 'Google authentication failed');
        console.error('Auth failed:', data);
      }
    } catch (error) {
      console.error('Google auth error:', error);
      setError('Failed to authenticate with Google');
    }
  };

  const handleGoogleError = () => {
    console.error('Google sign-in failed');
    setError('Google sign-in failed. Please try again.');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
      {/* Mesh gradient background */}
      <div className="mesh-gradient"></div>
      
      <div className="relative flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="card">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-semibold text-gray-900 dark:text-white mb-2">
                Sign in to WAF Security
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Or{' '}
                <Link to="/register" className="font-medium text-primary hover:text-primary-dark transition-colors">
                  create a new account
                </Link>
              </p>
            </div>
        
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={formData.username}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Enter your username"
                  />
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Enter your password"
                  />
                </div>
              </div>

              {(error || state.error) && (
                <div className="bg-red-50 dark:bg-red-100 border border-red-200 dark:border-red-300 rounded-lg p-4">
                  <p className="text-red-600 dark:text-red-700 text-sm">{error || state.error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={state.isLoading}
                className="w-full btn btn-primary disabled:opacity-50"
              >
                {state.isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            {/* Google OAuth Section - Only show if configured */}
            {oauthConfig.google.enabled && (
              <>
                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      Or continue with
                    </span>
                  </div>
                </div>

                {/* Google Sign-In Button */}
                <div className="w-full google-signin-container">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    useOneTap={false}
                    theme="filled_blue"
                    size="large"
                    text="signin_with"
                    shape="rectangular"
                    width="400"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;