import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useAuth } from '@context/AuthContext';

const RegisterPage: React.FC = () => {
  const { state, register } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    bio: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const result = await register(formData);
    
    if (result.success) {
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } else {
      setError(result.error || 'Registration failed');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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
                Create your account
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Or{' '}
                <Link to="/login" className="font-medium text-primary hover:text-primary-dark transition-colors">
                  sign in to your existing account
                </Link>
              </p>
            </div>
        
            {success ? (
              <div className="bg-green-50 dark:bg-green-100 border border-green-200 dark:border-green-300 rounded-lg p-4 text-center">
                <p className="text-green-600 dark:text-green-700">Registration successful! Redirecting to login...</p>
              </div>
            ) : (
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
                      placeholder="Choose a username"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="Enter your email"
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
                      placeholder="Choose a password"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Bio (optional)
                    </label>
                    <textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      className="input-field"
                      rows={3}
                      placeholder="Tell us about yourself"
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
                  {state.isLoading ? 'Creating account...' : 'Create account'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;