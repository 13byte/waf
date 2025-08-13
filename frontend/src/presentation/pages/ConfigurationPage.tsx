// WAF configuration page
import React, { useState, useEffect } from 'react';
import { Settings, Shield, Save, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';

const ConfigurationPage: React.FC = () => {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newIp, setNewIp] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/waf/config', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Failed to fetch config:', error);
    }
    setLoading(false);
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await fetch('/api/waf/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          paranoia_level: config.paranoia_level,
          rule_engine: config.rule_engine,
          audit_engine: config.audit_engine,
          anomaly_threshold: config.anomaly_threshold
        })
      });
      alert('Configuration saved successfully');
    } catch (error) {
      alert('Failed to save configuration');
    }
    setSaving(false);
  };

  const addBlockedIp = async () => {
    if (!newIp) return;
    try {
      await fetch('/api/waf/config/blocked-ips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ ip: newIp })
      });
      setConfig({
        ...config,
        blocked_ips: [...(config.blocked_ips || []), newIp]
      });
      setNewIp('');
    } catch (error) {
      alert('Failed to add IP');
    }
  };

  const removeBlockedIp = async (ip: string) => {
    try {
      await fetch(`/api/waf/config/blocked-ips/${ip}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setConfig({
        ...config,
        blocked_ips: config.blocked_ips.filter((i: string) => i !== ip)
      });
    } catch (error) {
      alert('Failed to remove IP');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          WAF Configuration
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Configure WAF settings and protection rules
        </p>
      </div>

      {/* General Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
          <Settings className="w-5 h-5 mr-2" />
          General Settings
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Paranoia Level (1-4)
            </label>
            <input
              type="number"
              min="1"
              max="4"
              value={config?.paranoia_level || 1}
              onChange={(e) => setConfig({ ...config, paranoia_level: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Higher levels provide more protection but may cause false positives
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Anomaly Threshold
            </label>
            <input
              type="number"
              min="0"
              value={config?.anomaly_threshold || 5}
              onChange={(e) => setConfig({ ...config, anomaly_threshold: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Requests exceeding this score will be blocked
            </p>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Rule Engine
            </span>
            <button
              onClick={() => setConfig({ ...config, rule_engine: !config.rule_engine })}
              className="text-blue-600 dark:text-blue-400"
            >
              {config?.rule_engine ? 
                <ToggleRight className="w-8 h-8" /> : 
                <ToggleLeft className="w-8 h-8 text-gray-400" />
              }
            </button>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Audit Engine
            </span>
            <button
              onClick={() => setConfig({ ...config, audit_engine: !config.audit_engine })}
              className="text-blue-600 dark:text-blue-400"
            >
              {config?.audit_engine ? 
                <ToggleRight className="w-8 h-8" /> : 
                <ToggleLeft className="w-8 h-8 text-gray-400" />
              }
            </button>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={saveConfig}
            disabled={saving}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg 
                     hover:bg-blue-700 disabled:opacity-50"
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

      {/* IP Block List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Blocked IPs
        </h2>

        <div className="mb-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              placeholder="Enter IP address"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <button
              onClick={addBlockedIp}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Block IP
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {config?.blocked_ips?.length > 0 ? (
            config.blocked_ips.map((ip: string) => (
              <div key={ip} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                <span className="font-mono text-sm">{ip}</span>
                <button
                  onClick={() => removeBlockedIp(ip)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No blocked IPs</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfigurationPage;