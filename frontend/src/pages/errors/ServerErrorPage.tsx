import React from 'react';
import { Link } from 'react-router-dom';
import { ServerCrash, RefreshCw, Home, ArrowLeft } from 'lucide-react';

const ServerErrorPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <ServerCrash className="mx-auto h-24 w-24 text-orange-600 mb-4" />
          <h1 className="text-6xl font-bold text-gray-900 mb-2">500</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Server Error</h2>
        </div>

        <div className="text-gray-600 mb-6">
          <p className="mb-4">Something went wrong on our end. Please try again later.</p>
          <p className="text-sm">If the problem persists, please contact the administrator.</p>
        </div>

        <div className="space-y-3">
          <button 
            onClick={() => window.location.reload()} 
            className="w-full btn-primary flex items-center justify-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
          
          <Link 
            to="/" 
            className="w-full btn-secondary flex items-center justify-center"
          >
            <Home className="h-4 w-4 mr-2" />
            Return Home
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
          Error Code: 500 • WAF Test Platform
        </div>
      </div>
    </div>
  );
};

export default ServerErrorPage;