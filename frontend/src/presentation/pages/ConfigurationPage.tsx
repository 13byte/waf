// Configuration page - GeoIP Database Management
import React, { useState, useEffect } from 'react';
import { 
  Globe, Upload, CheckCircle, AlertCircle, XCircle, Trash2, Database
} from 'lucide-react';
import { apiClient } from '../../utils/api';

interface GeoipStatus {
  uploaded: boolean;
  filename?: string;
  last_updated?: string;
  size?: number;
  entries?: number;
}

const ConfigurationPage: React.FC = () => {
  const [geoipFile, setGeoipFile] = useState<File | null>(null);
  const [geoipUploading, setGeoipUploading] = useState(false);
  const [geoipStatus, setGeoipStatus] = useState<GeoipStatus | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    fetchGeoipStatus();
  }, []);

  const fetchGeoipStatus = async () => {
    try {
      const response = await apiClient.getGeoipStatus();
      if (response.data) {
        setGeoipStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch GeoIP status:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setGeoipFile(e.target.files[0]);
    }
  };

  const uploadGeoipFile = async () => {
    if (!geoipFile) return;
    
    setGeoipUploading(true);
    setShowErrorMessage(false);
    
    try {
      const response = await apiClient.uploadGeoipDatabase(geoipFile);
      if (response.data) {
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 5000);
        fetchGeoipStatus();
        setGeoipFile(null);
        // Reset the file input
        const fileInput = document.getElementById('geoip-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setErrorText(response.error || 'Failed to upload GeoIP database');
        setShowErrorMessage(true);
        setTimeout(() => setShowErrorMessage(false), 5000);
      }
    } catch (error) {
      console.error('Failed to upload GeoIP database:', error);
      setErrorText('Failed to upload GeoIP database');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 5000);
    }
    
    setGeoipUploading(false);
  };

  const deleteGeoipDatabase = async () => {
    if (!confirm('Are you sure you want to delete the GeoIP database? This will disable geographic information for IP addresses.')) {
      return;
    }
    
    try {
      const response = await apiClient.deleteGeoipDatabase();
      if (response.data) {
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 5000);
        fetchGeoipStatus();
      }
    } catch (error) {
      console.error('Failed to delete GeoIP database:', error);
      setErrorText('Failed to delete GeoIP database');
      setShowErrorMessage(true);
      setTimeout(() => setShowErrorMessage(false), 5000);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="mb-6">
          <h1 className="section-title">GeoIP Configuration</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage geographic IP database for location tracking
          </p>
        </div>
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg shadow-lg animate-slide-in">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Operation completed successfully</span>
        </div>
      )}

      {/* Error Message */}
      {showErrorMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg shadow-lg animate-slide-in">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">{errorText}</span>
        </div>
      )}

      <div className="space-y-6">
        <div className="card">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
            <Globe className="w-5 h-5 mr-2 text-gray-500" />
            GeoIP Database Management
          </h2>

          {/* Status */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Database Status</span>
              {geoipStatus?.uploaded ? (
                <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  Active
                </span>
              ) : (
                <span className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <XCircle className="w-4 h-4" />
                  Not configured
                </span>
              )}
            </div>
            
            {geoipStatus?.uploaded && (
              <>
                <div className="space-y-1 mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Database</span>
                    <span className="text-gray-900 dark:text-white font-medium">
                      {geoipStatus.filename || 'GeoIP Database'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Last Updated</span>
                    <span className="text-gray-900 dark:text-white">
                      {geoipStatus.last_updated ? 
                        new Date(geoipStatus.last_updated).toLocaleDateString() : 
                        'Unknown'}
                    </span>
                  </div>
                  {geoipStatus.entries && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Total Entries</span>
                      <span className="text-gray-900 dark:text-white">
                        {geoipStatus.entries.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {geoipStatus.size && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">File Size</span>
                      <span className="text-gray-900 dark:text-white">
                        {(geoipStatus.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Upload Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload New Database
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  onChange={handleFileSelect}
                  accept=".mmdb,.dat"
                  className="hidden"
                  id="geoip-file"
                />
                <label
                  htmlFor="geoip-file"
                  className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <Database className="w-4 h-4" />
                  Choose Database File
                </label>
                {geoipFile && (
                  <>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {geoipFile.name}
                    </span>
                    <button
                      onClick={uploadGeoipFile}
                      disabled={geoipUploading}
                      className="btn btn-primary"
                    >
                      {geoipUploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Supported formats: MaxMind GeoIP2 (.mmdb) or GeoIP Legacy (.dat)
              </p>
            </div>

            {/* Delete Database Button */}
            {geoipStatus?.uploaded && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={deleteGeoipDatabase}
                  className="btn-danger"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Database
                </button>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Warning: Deleting the database will disable geographic information for all IP addresses.
                </p>
              </div>
            )}
          </div>

          {/* Information Box */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">About GeoIP Database</p>
                <p className="text-xs">
                  The GeoIP database enables geographic location tracking for IP addresses in security events. 
                  This helps identify attack patterns from specific regions and provides valuable context for security analysis.
                </p>
                <p className="text-xs mt-2">
                  You can download free GeoIP databases from MaxMind at{' '}
                  <a 
                    href="https://www.maxmind.com/en/geolite2/signup" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    maxmind.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigurationPage;