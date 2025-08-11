import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, AlertTriangle, Home, ArrowLeft } from 'lucide-react';

const ForbiddenPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <Shield className="mx-auto h-24 w-24 text-red-600 mb-4" />
          <h1 className="text-6xl font-bold text-gray-900 mb-2">403</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Access Forbidden</h2>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
            <div className="text-left">
              <h3 className="text-sm font-medium text-yellow-800">WAF Protection Active</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Your request was blocked by the Web Application Firewall. 
                This could be due to suspicious activity or malicious patterns in your request.
              </p>
            </div>
          </div>
        </div>

        <div className="text-gray-600 mb-6">
          <p className="mb-2">If you believe this is an error, please:</p>
          <ul className="text-sm text-left space-y-1">
            <li>• Check your request parameters</li>
            <li>• Avoid suspicious characters or patterns</li>
            <li>• Contact the administrator if needed</li>
          </ul>
        </div>

        <div className="space-y-3">
          <Link 
            to="/" 
            className="w-full btn-primary flex items-center justify-center"
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
          Error Code: 403 • WAF Protection by ModSecurity
        </div>
      </div>
    </div>
  );
};

export default ForbiddenPage;