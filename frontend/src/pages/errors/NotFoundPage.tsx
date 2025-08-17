import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, Search, Home, ArrowLeft } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <FileQuestion className="mx-auto h-24 w-24 text-blue-600 mb-4" />
          <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
        </div>

        <div className="text-gray-600 mb-6">
          <p className="mb-4">The page you're looking for doesn't exist or has been moved.</p>
          <p className="text-sm">Please check the URL or navigate back to a valid page.</p>
        </div>

        <div className="space-y-3">
          <Link 
            to="/" 
            className="w-full btn-primary flex items-center justify-center"
          >
            <Home className="h-4 w-4 mr-2" />
            Return Home
          </Link>
          
          <Link 
            to="/vulnerable" 
            className="w-full btn-secondary flex items-center justify-center"
          >
            <Search className="h-4 w-4 mr-2" />
            WAF Testing
          </Link>
          
          <button 
            onClick={() => window.history.back()} 
            className="w-full btn-secondary flex items-center justify-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </button>
        </div>

        <div className="mt-6 text-xs text-gray-500">
          Error Code: 404 • WAF Test Platform
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;