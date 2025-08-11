import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Search, AlertTriangle, Eye, Clock, Globe, Ban, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { apiClient } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import type { WafLog, WafStats } from '../types';

// --- Helper Components ---

const StatCard = ({ title, value, icon, rate }: { title: string; value: number | string; icon: React.ReactNode; rate?: string }) => (
  <div className="card">
    <div className="card-body">
      <div className="flex items-center">
        {icon}
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}{rate && <span className="text-base font-medium text-gray-500"> %</span>}</p>
        </div>
      </div>
    </div>
  </div>
);

const LogDetailView = ({ log }: { log: WafLog }) => {
  return (
    <div className="border-t bg-gray-50 p-4 animate-slideDown">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
        <div>
          <h4 className="font-semibold text-gray-800 mb-2">Request Details</h4>
          <div className="space-y-1">
            <p><strong className="w-24 inline-block">URI:</strong> <code className="bg-gray-200 px-1 rounded text-xs break-all">{log.uri}</code></p>
            <p><strong className="w-24 inline-block">Method:</strong> {log.method}</p>
            <p><strong className="w-24 inline-block">Status Code:</strong> {log.status_code}</p>
            <p><strong className="w-24 inline-block">Severity:</strong> <span className="font-bold text-red-600">{log.severity_score}</span></p>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-gray-800 mb-2">Attack Information</h4>
          <div className="space-y-1">
            <p><strong className="w-24 inline-block">Attack Types:</strong> {log.attack_types?.join(', ') || 'N/A'}</p>
            <p><strong className="w-24 inline-block">Rule IDs:</strong> {log.rule_ids?.join(', ') || 'N/A'}</p>
          </div>
        </div>
        <div className="lg:col-span-2">
          <h4 className="font-semibold text-gray-800 mb-2">Raw Log</h4>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-auto max-h-48 font-mono">
            {JSON.stringify(log.raw_log, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};


// --- Main Page Component ---

const LogMonitoringPage: React.FC = () => {
  const { state: authState } = useAuth();
  const [logs, setLogs] = useState<WafLog[]>([]);
  const [stats, setStats] = useState<WafStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ search: '', attack_type: '', blocked_only: false });

  const LOGS_PER_PAGE = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const logsPromise = apiClient.getWafLogs({
      skip: (page - 1) * LOGS_PER_PAGE,
      limit: LOGS_PER_PAGE,
      ...filters
    });
    const statsPromise = apiClient.getWafStats();

    const [logsResponse, statsResponse] = await Promise.all([logsPromise, statsPromise]);

    if (logsResponse.data) {
      setLogs(logsResponse.data.logs);
      setTotalPages(Math.ceil(logsResponse.data.total / LOGS_PER_PAGE));
    } else {
      setError(logsResponse.error || 'Failed to fetch logs.');
    }

    if (statsResponse.data) {
      setStats(statsResponse.data);
    } else {
      setError(prev => prev ? `${prev} | ${statsResponse.error}` : statsResponse.error || 'Failed to fetch stats.');
    }

    setLoading(false);
  }, [page, filters]);

  useEffect(() => {
    if (authState.user) {
      fetchData();
    }
  }, [authState.user, fetchData]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    setFilters(prev => ({
      ...prev,
      [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  if (!authState.user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <div className="card max-w-lg mx-auto">
          <div className="card-body">
            <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
            <p className="text-gray-600 mb-4">Please sign in to access the WAF log monitoring dashboard.</p>
            <Link to="/login" className="btn-primary">Sign In</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Shield className="h-8 w-8 mr-3 text-blue-600" />
          WAF Monitoring Dashboard
        </h1>
        <p className="text-gray-600 mt-2">Real-time analysis of ModSecurity logs from the database.</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Requests" value={stats?.total_requests ?? 0} icon={<Globe className="h-8 w-8 text-blue-600" />} />
        <StatCard title="Blocked Requests" value={stats?.blocked_requests ?? 0} icon={<Ban className="h-8 w-8 text-red-600" />} />
        <StatCard title="Block Rate" value={stats?.block_rate ?? 0} rate="%" icon={<AlertTriangle className="h-8 w-8 text-orange-600" />} />
        <StatCard title="Allowed Requests" value={(stats?.total_requests ?? 0) - (stats?.blocked_requests ?? 0)} icon={<CheckCircle className="h-8 w-8 text-green-600" />} />
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="card-body">
          <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input type="text" name="search" value={filters.search} onChange={handleFilterChange} className="input-field pl-10" placeholder="Search by IP or URI..."/>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Attack Type</label>
              <select name="attack_type" value={filters.attack_type} onChange={handleFilterChange} className="input-field">
                <option value="">All Types</option>
                <option value="XSS">XSS</option>
                <option value="SQLI">SQL Injection</option>
                <option value="RCE">RCE</option>
                <option value="LFI">LFI</option>
                <option value="PROTOCOL">Protocol Violation</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center h-9">
                <input type="checkbox" name="blocked_only" checked={filters.blocked_only} onChange={handleFilterChange} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <label className="ml-2 text-sm text-gray-700">Blocked Only</label>
              </div>
              <button type="submit" className="btn-primary">Apply</button>
            </div>
          </form>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">WAF Logs</h2>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-600">Loading logs...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">{error}</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-600">No logs found matching your criteria.</div>
          ) : (
            <div className="divide-y divide-gray-200">
              {logs.map((log) => (
                <div key={log.id}>
                  <div className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-50" onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}>
                    <div className="flex items-center space-x-4 flex-1">
                      {log.is_blocked ? <Ban className="h-5 w-5 text-red-500 flex-shrink-0"/> : <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0"/>}
                      <div className="w-48"><Clock className="h-4 w-4 inline-block mr-1 text-gray-400"/>{new Date(log.timestamp).toLocaleString()}</div>
                      <div className="w-32 font-mono">{log.client_ip}</div>
                      <div className="flex-1 font-medium text-gray-800 truncate">{log.method} {log.uri}</div>
                      <div className="w-32 text-center"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${log.attack_types && log.attack_types.length > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{log.attack_types?.[0] || 'Normal'}</span></div>
                    </div>
                    {expandedLog === log.id ? <ChevronUp className="h-5 w-5 text-gray-500"/> : <ChevronDown className="h-5 w-5 text-gray-500"/>}
                  </div>
                  {expandedLog === log.id && <LogDetailView log={log} />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogMonitoringPage;
