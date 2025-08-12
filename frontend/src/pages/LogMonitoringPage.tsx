import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Search, AlertTriangle, Clock, Globe, Ban, CheckCircle, ChevronDown, ChevronUp, Activity, Server, Monitor, FileWarning } from 'lucide-react';
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
    <tr>
      <td colSpan={8} className="bg-gray-50 px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">🌐 Network Information</h4>
            <div className="space-y-1 bg-white p-3 rounded">
              <p><strong className="w-32 inline-block">Source:</strong> {log.source_ip}:{log.source_port || 'N/A'}</p>
              <p><strong className="w-32 inline-block">Destination:</strong> {log.dest_ip || 'N/A'}:{log.dest_port || 'N/A'}</p>
              <p><strong className="w-32 inline-block">Target Website:</strong> <span className="text-blue-600 font-medium">{log.target_website || 'N/A'}</span></p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">📊 Request Details</h4>
            <div className="space-y-1 bg-white p-3 rounded">
              <p><strong className="w-32 inline-block">Method:</strong> <span className="font-mono">{log.method}</span></p>
              <p><strong className="w-32 inline-block">Status Code:</strong> <span className={`font-bold ${log.status_code >= 400 ? 'text-red-600' : 'text-green-600'}`}>{log.status_code}</span></p>
              <p><strong className="w-32 inline-block">URI:</strong> <code className="bg-gray-100 px-1 rounded text-xs break-all">{log.uri}</code></p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">🛡️ Security Analysis</h4>
            <div className="space-y-1 bg-white p-3 rounded">
              <p><strong className="w-32 inline-block">Attack Types:</strong> 
                {log.attack_types && log.attack_types.length > 0 ? (
                  <span className="ml-2">
                    {log.attack_types.map((type, i) => (
                      <span key={i} className="inline-block bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded mr-1">{type}</span>
                    ))}
                  </span>
                ) : <span className="text-gray-500">None detected</span>}
              </p>
              <p><strong className="w-32 inline-block">Severity Score:</strong> <span className={`font-bold ${log.severity_score > 0 ? 'text-orange-600' : 'text-gray-500'}`}>{log.severity_score}</span></p>
              <p><strong className="w-32 inline-block">Anomaly Score:</strong> <span className={`font-bold ${log.anomaly_score > 0 ? 'text-orange-600' : 'text-gray-500'}`}>{log.anomaly_score}</span></p>
              <p><strong className="w-32 inline-block">Rule IDs:</strong> <span className="font-mono text-xs">{log.rule_ids?.join(', ') || 'None'}</span></p>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">🚦 Detection Status</h4>
            <div className="space-y-1 bg-white p-3 rounded">
              <p><strong className="w-32 inline-block">Blocked:</strong> 
                {log.is_blocked ? 
                  <span className="text-red-600 font-bold ml-2">✓ Yes (Blocked by WAF)</span> : 
                  <span className="text-green-600 ml-2">✗ No (Allowed through)</span>}
              </p>
              <p><strong className="w-32 inline-block">Attack Detected:</strong> 
                {log.is_attack ? 
                  <span className="text-red-600 font-bold ml-2">⚠️ Yes</span> : 
                  <span className="text-gray-500 ml-2">No</span>}
              </p>
            </div>
          </div>
          {log.raw_log && (
            <div className="lg:col-span-2">
              <h4 className="font-semibold text-gray-800 mb-2">📝 Raw Log Data</h4>
              <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-auto max-h-48 font-mono">
                {JSON.stringify(log.raw_log, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </td>
    </tr>
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
  const [filters, setFilters] = useState({ 
    search: '', 
    attack_type: '', 
    blocked_only: false,
    is_attack_only: false,
    status_code: '',
    start_date: '',
    end_date: ''
  });

  const LOGS_PER_PAGE = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    // Clean up filters before sending
    const cleanFilters = {
      skip: (page - 1) * LOGS_PER_PAGE,
      limit: LOGS_PER_PAGE,
      search: filters.search,
      attack_type: filters.attack_type,
      blocked_only: filters.blocked_only,
      is_attack_only: filters.is_attack_only,
      ...(filters.status_code && { status_code: parseInt(filters.status_code) }),
      ...(filters.start_date && { start_date: filters.start_date }),
      ...(filters.end_date && { end_date: filters.end_date })
    };
    
    const logsPromise = apiClient.getWafLogs(cleanFilters);
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
          <form onSubmit={handleFilterSubmit} className="space-y-4">
            {/* First Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" name="search" value={filters.search} onChange={handleFilterChange} 
                    className="input-field pl-10" placeholder="Search by IP, URI, domain, method..."/>
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
                  <option value="RFI">RFI</option>
                  <option value="PHP">PHP Injection</option>
                  <option value="JAVA">Java Attack</option>
                  <option value="SCANNER">Scanner Detection</option>
                  <option value="PROTOCOL">Protocol Violation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status Code</label>
                <select name="status_code" value={filters.status_code} onChange={handleFilterChange} className="input-field">
                  <option value="">All Codes</option>
                  <option value="200">200 OK</option>
                  <option value="403">403 Forbidden</option>
                  <option value="404">404 Not Found</option>
                  <option value="500">500 Error</option>
                </select>
              </div>
            </div>
            
            {/* Second Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                <input type="date" name="start_date" value={filters.start_date} onChange={handleFilterChange} 
                  className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input type="date" name="end_date" value={filters.end_date} onChange={handleFilterChange} 
                  className="input-field" />
              </div>
              <div className="flex items-end space-x-4">
                <label className="flex items-center">
                  <input type="checkbox" name="blocked_only" checked={filters.blocked_only} onChange={handleFilterChange} 
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  <span className="ml-2 text-sm text-gray-700">Blocked Only</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" name="is_attack_only" checked={filters.is_attack_only} onChange={handleFilterChange} 
                    className="h-4 w-4 rounded border-gray-300 text-red-600 focus:ring-red-500" />
                  <span className="ml-2 text-sm text-gray-700">Attacks Only</span>
                </label>
              </div>
              <div className="flex items-end justify-end space-x-2">
                <button type="button" onClick={() => {
                  setFilters({ 
                    search: '', attack_type: '', blocked_only: false, 
                    is_attack_only: false, status_code: '', start_date: '', end_date: '' 
                  });
                  setPage(1);
                }} className="btn-secondary">Clear</button>
                <button type="submit" className="btn-primary">Apply Filters</button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card overflow-hidden">
        <div className="card-header bg-gray-800 text-white">
          <h2 className="text-xl font-semibold flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            WAF Request Logs
          </h2>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-600">Loading logs...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-600">{error}</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-gray-600">No logs found matching your criteria.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Request</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Attack</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className={`hover:bg-gray-50 cursor-pointer ${log.is_blocked ? 'bg-red-50' : ''}`} 
                        onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}>
                      <td className="px-3 py-3 whitespace-nowrap text-sm">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1 text-gray-400"/>
                          <span className="text-xs">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs font-mono">
                        {log.source_ip}:{log.source_port || 'N/A'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-xs font-mono">
                        {log.dest_ip || 'N/A'}:{log.dest_port || 'N/A'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className="text-xs font-medium text-blue-600">{log.target_website || 'N/A'}</span>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <span className="font-bold mr-2">{log.method}</span>
                        <span className="text-gray-600 truncate inline-block max-w-xs">{log.uri}</span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        {log.is_attack ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            {log.attack_types?.[0] || 'Attack'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Normal
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        {log.is_blocked ? (
                          <span title="Blocked">
                            <Ban className="h-5 w-5 text-red-500 inline-block" />
                          </span>
                        ) : (
                          <span title="Allowed">
                            <CheckCircle className="h-5 w-5 text-green-500 inline-block" />
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        {expandedLog === log.id ? 
                          <ChevronUp className="h-4 w-4 text-gray-500"/> : 
                          <ChevronDown className="h-4 w-4 text-gray-500"/>}
                      </td>
                    </tr>
                    {expandedLog === log.id && <LogDetailView log={log} />}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary"
              >
                Previous
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{page}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => setPage(i + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === i + 1
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogMonitoringPage;