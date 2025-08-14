import React from 'react';

const LoadingSpinner: React.FC = () => (
  <div className="inline-flex items-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    <span className="ml-2 text-gray-600 dark:text-gray-400">Loading...</span>
  </div>
);

export default LoadingSpinner;