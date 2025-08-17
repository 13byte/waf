// Configuration page with modern Apple-inspired design
import React, { useState, useEffect } from 'react';
import { 
  Settings, Shield, Save, Plus, Trash2, Upload, Globe, 
  CheckCircle, AlertCircle, Info, Lock, Key, Server,
  Activity, Sliders, Database, FileText, Download,
  RefreshCw, XCircle, ChevronRight
} from 'lucide-react';
import { apiClient } from '../../utils/api';

interface WafConfig {
  paranoia_level: number;
  rule_engine: boolean;
  audit_engine: boolean;
  anomaly_threshold: number;
  blocked_ips: string[];
  custom_rules?: any[];
  rate_limiting?: {
    enabled: boolean;
    requests_per_minute: number;
    burst_size: number;
  };
}

interface GeoipStatus {
  uploaded: boolean;
  filename?: string;
  last_updated?: string;
  size?: number;
  entries?: number;
}

const ConfigurationPage: React.FC = () => {
  const [config, setConfig] = useState<WafConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newIp, setNewIp] = useState('');
  const [geoipFile, setGeoipFile] = useState<File | null>(null);
  const [geoipUploading, setGeoipUploading] = useState(false);
  const [geoipStatus, setGeoipStatus] = useState<GeoipStatus | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    fetchConfig();
    fetchGeoipStatus();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/waf/config', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
    setLoading(false);
  };

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

  const saveConfig = async () => {
    if (!config) return;
    
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/waf/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paranoia_level: config.paranoia_level,
          rule_engine: config.rule_engine,
          audit_engine: config.audit_engine,
          anomaly_threshold: config.anomaly_threshold
        })
      });
      
      if (response.ok) {
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
    setSaving(false);
  };

  const addBlockedIp = async () => {
    if (!newIp || !config) return;
    
    // Validate IP format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(newIp)) {
      alert('Please enter a valid IP address');
      return;
    }
    
    try {
      const token = localStorage.getItem('auth_token');
      await fetch('/api/waf/config/blocked-ips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ip: newIp })
      });
      
      setConfig({
        ...config,
        blocked_ips: [...(config.blocked_ips || []), newIp]
      });
      setNewIp('');
    } catch (error) {
      console.error('Failed to add IP:', error);
    }
  };

  const removeBlockedIp = async (ip: string) => {
    if (!config) return;
    
    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`/api/waf/config/blocked-ips/${ip}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setConfig({
        ...config,
        blocked_ips: config.blocked_ips.filter((i: string) => i !== ip)
      });
    } catch (error) {
      console.error('Failed to remove IP:', error);
    }
  };

  const uploadGeoipFile = async () => {
    if (!geoipFile) return;

    setGeoipUploading(true);
    try {
      const response = await apiClient.uploadGeoipDatabase(geoipFile);
      
      if (response.data) {
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
        setGeoipFile(null);
        await fetchGeoipStatus();
      }
    } catch (error) {
      console.error('Failed to upload GeoIP database:', error);
    } finally {
      setGeoipUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const validExtensions = ['.mmdb', '.dat'];
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      
      if (!validExtensions.includes(fileExtension)) {
        alert('Please select a valid GeoIP database file (.mmdb or .dat)');
        return;
      }
      
      setGeoipFile(file);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20"></div>
          <div className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-t-4 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="mb-6">
          <h1 className="section-title">WAF Configuration</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Protection rules and security settings
          </p>
        </div>
        <button
          onClick={fetchConfig}
          className="btn btn-secondary"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-300 px-4 py-3 rounded-lg shadow-lg animate-slide-in">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Configuration saved successfully</span>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {[
          { id: 'general', label: 'General', icon: Settings },
          { id: 'security', label: 'Security Rules', icon: Shield },
          { id: 'geoip', label: 'GeoIP Database', icon: Globe },
          { id: 'advanced', label: 'Advanced', icon: Sliders }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab ${activeTab === tab.id ? 'active' : ''} flex items-center gap-2`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'general' && config && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
              <Settings className="w-5 h-5 mr-2 text-gray-500" />
              General Settings
            </h2>

            <div className="space-y-6">
              {/* Paranoia Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Paranoia Level
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="4"
                    value={config.paranoia_level || 1}
                    onChange={(e) => setConfig({ ...config, paranoia_level: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
                    <span className="text-lg font-bold text-primary">{config.paranoia_level}</span>
                  </div>
                </div>
                <div className="mt-2 flex items-start gap-2">
                  <Info className="w-4 h-4 text-gray-400 mt-0.5" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Higher levels provide more protection but may cause false positives. Level 1 is recommended for most applications.
                  </p>
                </div>
              </div>

              {/* Anomaly Threshold */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Anomaly Threshold
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={config.anomaly_threshold || 5}
                    onChange={(e) => setConfig({ ...config, anomaly_threshold: parseInt(e.target.value) })}
                    className="input-field w-32"
                  />
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-red-500 transition-all duration-300"
                      style={{ width: `${Math.min(100, (config.anomaly_threshold || 5) * 2)}%` }}
                    />
                  </div>
                </div>
                <div className="mt-2 flex items-start gap-2">
                  <Info className="w-4 h-4 text-gray-400 mt-0.5" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Requests exceeding this score will be blocked. Lower values are more strict.
                  </p>
                </div>
              </div>

              {/* Toggle Switches */}
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">Rule Engine</span>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Enable ModSecurity rule processing
                    </p>
                  </div>
                  <button
                    onClick={() => setConfig({ ...config, rule_engine: !config.rule_engine })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      config.rule_engine ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.rule_engine ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">Audit Engine</span>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Log all security events for analysis
                    </p>
                  </div>
                  <button
                    onClick={() => setConfig({ ...config, audit_engine: !config.audit_engine })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      config.audit_engine ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.audit_engine ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4">
                <button
                  onClick={saveConfig}
                  disabled={saving}
                  className="btn btn-primary"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && config && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-gray-500" />
              IP Block List
            </h2>

            {/* Add IP Form */}
            <div className="mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  placeholder="Enter IP address (e.g., 192.168.1.1)"
                  className="flex-1 input-field"
                  onKeyPress={(e) => e.key === 'Enter' && addBlockedIp()}
                />
                <button
                  onClick={addBlockedIp}
                  className="btn-danger"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Block IP
                </button>
              </div>
            </div>

            {/* Blocked IPs List */}
            <div className="space-y-2">
              {config.blocked_ips?.length > 0 ? (
                config.blocked_ips.map((ip: string) => (
                  <div 
                    key={ip} 
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="font-mono text-sm text-gray-900 dark:text-white">{ip}</span>
                    </div>
                    <button
                      onClick={() => removeBlockedIp(ip)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-gray-300 dark:text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No blocked IPs configured</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                    Add IP addresses to block malicious traffic
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Rate Limiting */}
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-gray-500" />
              Rate Limiting
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <span className="font-medium text-gray-900 dark:text-white">Enable Rate Limiting</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Limit requests per IP address
                  </p>
                </div>
                <button
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.rate_limiting?.enabled ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.rate_limiting?.enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {config.rate_limiting?.enabled && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Requests per minute
                    </label>
                    <input
                      type="number"
                      value={config.rate_limiting?.requests_per_minute || 60}
                      className="input-field w-32"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Burst size
                    </label>
                    <input
                      type="number"
                      value={config.rate_limiting?.burst_size || 10}
                      className="input-field w-32"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'geoip' && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
              <Globe className="w-5 h-5 mr-2 text-gray-500" />
              GeoIP Database
            </h2>

            {/* Status */}
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</span>
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
                        <span className="text-gray-500 dark:text-gray-400">Entries</span>
                        <span className="text-gray-900 dark:text-white">
                          {geoipStatus.entries.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload GeoIP Database
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
                  <Upload className="w-4 h-4" />
                  Choose File
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
                        'Upload'
                      )}
                    </button>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Supported formats: MaxMind GeoIP2 (.mmdb) or Legacy (.dat)
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'advanced' && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6 flex items-center">
              <Sliders className="w-5 h-5 mr-2 text-gray-500" />
              Advanced Settings
            </h2>

            <div className="space-y-6">
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                      Advanced Configuration
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                      These settings can significantly impact WAF behavior. Modify with caution.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <button className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-gray-500" />
                    <div className="text-left">
                      <span className="font-medium text-gray-900 dark:text-white">Export Configuration</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Download current configuration as JSON
                      </p>
                    </div>
                  </div>
                  <Download className="w-5 h-5 text-gray-400" />
                </button>

                <button className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-500" />
                    <div className="text-left">
                      <span className="font-medium text-gray-900 dark:text-white">Custom Rules</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Manage custom ModSecurity rules
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>

                <button className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5 text-gray-500" />
                    <div className="text-left">
                      <span className="font-medium text-gray-900 dark:text-white">API Keys</span>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Manage API access credentials
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConfigurationPage;