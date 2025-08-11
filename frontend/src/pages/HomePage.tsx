import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Users, FileText, Bug } from 'lucide-react';
import { useAuth } from '@context/AuthContext';

const HomePage: React.FC = () => {
  const { state } = useAuth();

  return (
    <>
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <Shield className="mx-auto h-16 w-16 text-primary-600" />
            <h1 className="mt-4 text-4xl font-bold text-gray-900 sm:text-5xl">
              WAF Test Platform
            </h1>
            <p className="mt-6 text-lg text-gray-600 max-w-3xl mx-auto">
              Comprehensive ModSecurity and Web Application Firewall testing environment. 
              Test various attack vectors including XSS, SQL Injection, and Path Traversal vulnerabilities.
            </p>
            
            {!state.user ? (
              <div className="mt-8 flex justify-center space-x-4">
                <Link to="/register" className="btn-primary">
                  Get Started
                </Link>
                <Link to="/login" className="btn-secondary">
                  Sign In
                </Link>
              </div>
            ) : (
              <div className="mt-8">
                <p className="text-gray-600 mb-4">Welcome back, {state.user.username}!</p>
                <div className="flex justify-center space-x-4">
                  <Link to="/posts" className="btn-primary">
                    View Posts
                  </Link>
                  <Link to="/vulnerable" className="btn-secondary">
                    WAF Tests
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Platform Features</h2>
            <p className="mt-4 text-lg text-gray-600">Comprehensive WAF testing capabilities</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="card">
              <div className="card-body text-center">
                <Users className="mx-auto h-12 w-12 text-primary-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">User Management</h3>
                <p className="text-gray-600">Complete authentication system with role-based access control</p>
              </div>
            </div>
            
            <div className="card">
              <div className="card-body text-center">
                <FileText className="mx-auto h-12 w-12 text-primary-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Content System</h3>
                <p className="text-gray-600">Full CRUD operations for posts and comments with categorization</p>
              </div>
            </div>
            
            <div className="card">
              <div className="card-body text-center">
                <Bug className="mx-auto h-12 w-12 text-primary-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Vulnerability Testing</h3>
                <p className="text-gray-600">Test XSS, SQL Injection, Path Traversal, and other attack vectors</p>
              </div>
            </div>
            
            <div className="card">
              <div className="card-body text-center">
                <Shield className="mx-auto h-12 w-12 text-primary-600 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Security Analysis</h3>
                <p className="text-gray-600">Comprehensive WAF rule testing and security assessment</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Test Categories</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-gray-900">XSS Testing</h3>
                </div>
                <div className="card-body">
                  <p className="text-gray-600 mb-4">Cross-Site Scripting vulnerability testing with various payload types</p>
                  <ul className="text-sm text-gray-500 space-y-1">
                    <li>• Reflected XSS</li>
                    <li>• Stored XSS</li>
                    <li>• DOM-based XSS</li>
                  </ul>
                </div>
              </div>
              
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-gray-900">SQL Injection</h3>
                </div>
                <div className="card-body">
                  <p className="text-gray-600 mb-4">Database injection attack testing and prevention validation</p>
                  <ul className="text-sm text-gray-500 space-y-1">
                    <li>• Union-based injection</li>
                    <li>• Boolean-based blind</li>
                    <li>• Time-based blind</li>
                  </ul>
                </div>
              </div>
              
              <div className="card">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-gray-900">Path Traversal</h3>
                </div>
                <div className="card-body">
                  <p className="text-gray-600 mb-4">File system access control testing and directory traversal</p>
                  <ul className="text-sm text-gray-500 space-y-1">
                    <li>• Directory traversal</li>
                    <li>• File inclusion</li>
                    <li>• Command injection</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default HomePage;
