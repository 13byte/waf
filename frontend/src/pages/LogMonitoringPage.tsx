import React, { useState, useEffect } from 'react';
import { Shield, Search, Filter, AlertTriangle, Eye, Clock, Globe, Ban, CheckCircle } from 'lucide-react';
import { apiClient } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

interface WafLog {
  id: string;
  timestamp: string;
  client_ip: string;
  method: string;
  uri: string;
  primary_attack: string;
  primary_rule_id: string;
  primary_file: string;
  attack_types: string[];
  rule_ids: string[];
  rule_files: string[];
  severity: number;
  is_blocked: boolean;
  response_code: number;
  user_agent: string;
  total_messages: number;
  attack_details: Array<{
    message: string;
    data: string;
    rule_id: string;
    file: string;
    severity: string;
    match: string;
  }>;
  raw_data: any;
}

interface WafStats {
  total_requests: number;
  blocked_requests: number;
  block_rate: number;
  top_attacks: Array<{ type: string; count: number }>;
  top_ips: Array<{ ip: string; count: number }>;
  top_rules: Array<{ rule_id: string; count: number }>;
}

const LogMonitoringPage: React.FC = () => {
  const { state } = useAuth();
  const [logs, setLogs] = useState<WafLog[]>([]);
  const [stats, setStats] = useState<WafStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAttackType, setSelectedAttackType] = useState('');
  const [blockedOnlyFilter, setBlockedOnlyFilter] = useState<boolean | null>(null);
  const [ipFilter, setIpFilter] = useState('');
  const [ruleIdFilter, setRuleIdFilter] = useState('');

  const limit = 20;

  const loadLogs = async (offset = 0, reset = false) => {
    const params = {
      limit,
      offset,
      ...(searchQuery && { search: searchQuery }),
      ...(selectedAttackType && { attack_type: selectedAttackType }),
      ...(blockedOnlyFilter !== null && { blocked_only: blockedOnlyFilter }),
      ...(ipFilter && { ip_filter: ipFilter }),
      ...(ruleIdFilter && { rule_id_filter: ruleIdFilter }),
    };

    const response = await apiClient.getWafLogs(params);
    
    if (response.data) {
      if (reset) {
        setLogs(response.data.logs);
      } else {
        setLogs(prev => [...prev, ...response.data.logs]);
      }
      setHasMore(response.data.has_more);
      setTotal(response.data.total);
    }
  };

  const loadStats = async () => {
    const response = await apiClient.getWafStats();
    if (response.data) {
      setStats(response.data);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadLogs(0, true), loadStats()]);
      setLoading(false);
    };

    if (state.user) {
      loadData();
    }
  }, [state.user, searchQuery, selectedAttackType, blockedOnlyFilter, ipFilter, ruleIdFilter]);

  const handleLoadMore = () => {
    const newOffset = (currentPage + 1) * limit;
    setCurrentPage(currentPage + 1);
    loadLogs(newOffset, false);
  };

  const toggleLogDetail = (logId: string) => {
    setExpandedLog(expandedLog === logId ? null : logId);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ko-KR');
  };

  const getAttackBadgeColor = (attackTypes: string[]) => {
    if (attackTypes.includes('XSS')) return 'bg-red-100 text-red-800';
    if (attackTypes.includes('SQLI')) return 'bg-purple-100 text-purple-800';
    if (attackTypes.includes('RCE')) return 'bg-orange-100 text-orange-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 4) return 'text-red-600';
    if (severity >= 3) return 'text-orange-600';
    if (severity >= 2) return 'text-yellow-600';
    return 'text-gray-600';
  };

  if (!state.user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card">
          <div className="card-body text-center">
            <Shield className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
            <p className="text-gray-600 mb-4">Please sign in to access WAF log monitoring.</p>
            <Link to="/login" className="btn-primary">Sign In</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Shield className="h-8 w-8 mr-3 text-blue-600" />
          WAF Log Monitoring
        </h1>
        <p className="text-gray-600 mt-2">ModSecurity 차단 로그 실시간 모니터링</p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <Globe className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_requests}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <Ban className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Blocked</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.blocked_requests}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Block Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.block_rate}%</p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Allowed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_requests - stats.blocked_requests}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Search attacks, URIs..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Attack Type</label>
              <select
                value={selectedAttackType}
                onChange={(e) => setSelectedAttackType(e.target.value)}
                className="input-field"
              >
                <option value="">All Types</option>
                <option value="XSS">XSS</option>
                <option value="SQLI">SQL Injection</option>
                <option value="RCE">Remote Code Execution</option>
                <option value="LFI">Local File Inclusion</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={blockedOnlyFilter === null ? '' : blockedOnlyFilter.toString()}
                onChange={(e) => setBlockedOnlyFilter(e.target.value === '' ? null : e.target.value === 'true')}
                className="input-field"
              >
                <option value="">All</option>
                <option value="true">Blocked Only</option>
                <option value="false">Allowed Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IP Filter</label>
              <input
                type="text"
                value={ipFilter}
                onChange={(e) => setIpFilter(e.target.value)}
                className="input-field"
                placeholder="192.168.1.1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rule ID</label>
              <input
                type="text"
                value={ruleIdFilter}
                onChange={(e) => setRuleIdFilter(e.target.value)}
                className="input-field"
                placeholder="941100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold text-gray-900">
            Recent WAF Logs ({total} total)
          </h2>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600">No logs found matching your criteria.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {logs.map((log) => (
                <div key={log.id} className="hover:bg-gray-50">
                  <div
                    className="p-4 cursor-pointer flex items-center justify-between"
                    onClick={() => toggleLogDetail(log.id)}
                  >
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600 font-mono">
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-mono text-gray-900">{log.client_ip}</span>
                        <span className="text-xs text-gray-500">→</span>
                        <span className="text-sm font-mono text-gray-700">{log.raw_data?.transaction?.host_ip || 'N/A'}:{log.raw_data?.transaction?.host_port || 'N/A'}</span>
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            {log.primary_attack}
                          </span>
                          {log.attack_types.length > 0 && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAttackBadgeColor(log.attack_types)}`}>
                              {log.attack_types[0]}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Rule: {log.primary_rule_id} | File: {log.primary_file} | {log.method} {log.uri.substring(0, 50)}
                          {log.uri.length > 50 && '...'}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        {log.is_blocked ? (
                          <div className="flex items-center text-red-600">
                            <Ban className="h-4 w-4 mr-1" />
                            <span className="text-sm font-medium">Blocked</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            <span className="text-sm font-medium">Allowed</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center">
                        <Eye className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {/* Detailed Log Slide */}
                  {expandedLog === log.id && (
                    <div className="border-t bg-gray-50 p-6 animate-slideDown">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Request Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex flex-col sm:flex-row">
                            <span className="font-medium w-32 flex-shrink-0">Method:</span> 
                            <span className="break-words">{log.method}</span>
                          </div>
                          <div className="flex flex-col sm:flex-row">
                            <span className="font-medium w-32 flex-shrink-0">URI:</span> 
                            <code className="bg-gray-200 px-1 rounded text-xs break-all flex-1 overflow-wrap-anywhere">{log.uri}</code>
                          </div>
                          <div className="flex flex-col sm:flex-row">
                            <span className="font-medium w-32 flex-shrink-0">User Agent:</span> 
                            <code className="bg-gray-200 px-1 rounded text-xs break-all flex-1 overflow-wrap-anywhere max-w-full">{log.user_agent}</code>
                          </div>
                          <div className="flex flex-col sm:flex-row">
                            <span className="font-medium w-32 flex-shrink-0">Response Code:</span> 
                            <span className="break-words">{log.response_code}</span>
                          </div>
                          <div className="flex flex-col sm:flex-row">
                            <span className="font-medium w-32 flex-shrink-0">Severity:</span> 
                            <span className={`font-medium ${getSeverityColor(log.severity)}`}>{log.severity}</span>
                          </div>
                          <div className="flex flex-col sm:flex-row">
                            <span className="font-medium w-32 flex-shrink-0">Total Messages:</span> 
                            <span className="break-words">{log.total_messages}</span>
                          </div>
                        </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Attack Information</h4>
                          <div className="space-y-2 text-sm">
                            <div>
                              <span className="font-medium">Attack Types:</span>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {log.attack_types.length > 0 ? log.attack_types.map((type, index) => (
                                  <span key={index} className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAttackBadgeColor([type])}`}>
                                    {type}
                                  </span>
                                )) : (
                                  <span className="text-gray-500 text-xs">No attack types detected</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Triggered Rules:</span>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {log.rule_ids.length > 0 ? log.rule_ids.map((ruleId, index) => (
                                  <span key={index} className="inline-flex items-center px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-mono">
                                    {ruleId}
                                  </span>
                                )) : (
                                  <span className="text-gray-500 text-xs">No rules triggered</span>
                                )}
                              </div>
                            </div>
                            <div>
                              <span className="font-medium">Rule Files:</span>
                              <div className="mt-1 flex flex-wrap gap-1">
                                {log.rule_files && log.rule_files.length > 0 ? log.rule_files.map((file, index) => (
                                  <span key={index} className="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-mono">
                                    {file}
                                  </span>
                                )) : (
                                  <span className="text-gray-500 text-xs">No rule files identified</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {log.attack_details && log.attack_details.length > 0 && (
                          <div className="lg:col-span-2">
                            <h4 className="text-sm font-medium text-gray-700 mb-3">Attack Details</h4>
                            <div className="space-y-3">
                              {log.attack_details.map((detail, index) => (
                                <div key={index} className="bg-white p-3 rounded border">
                                  <div className="space-y-3 text-xs">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div className="flex flex-col">
                                        <span className="font-medium text-gray-700 mb-1">Message:</span>
                                        <span className="break-words bg-gray-50 p-2 rounded">{detail.message}</span>
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="font-medium text-gray-700 mb-1">Rule ID:</span>
                                        <code className="bg-gray-100 px-2 py-1 rounded font-mono break-all">{detail.rule_id}</code>
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="font-medium text-gray-700 mb-1">File:</span>
                                        <code className="bg-gray-100 px-2 py-1 rounded font-mono text-xs break-all">{detail.file}</code>
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="font-medium text-gray-700 mb-1">Severity:</span>
                                        <span className="bg-gray-50 px-2 py-1 rounded">{detail.severity}</span>
                                      </div>
                                    </div>
                                    {detail.data && (
                                      <div className="flex flex-col">
                                        <span className="font-medium text-gray-700 mb-1">Attack Data:</span>
                                        <code className="bg-yellow-50 border border-yellow-200 px-2 py-2 rounded text-xs font-mono break-all whitespace-pre-wrap max-w-full overflow-auto">{detail.data}</code>
                                      </div>
                                    )}
                                    {detail.match && (
                                      <div className="flex flex-col">
                                        <span className="font-medium text-gray-700 mb-1">Pattern Match:</span>
                                        <code className="bg-red-50 border border-red-200 px-2 py-2 rounded text-xs font-mono break-all whitespace-pre-wrap max-w-full overflow-auto">{detail.match}</code>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="lg:col-span-2">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Raw Log Data</h4>
                          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-64 font-mono">
                            {JSON.stringify(log.raw_data, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Load More Button */}
          {hasMore && !loading && (
            <div className="p-4 border-t bg-gray-50 text-center">
              <button
                onClick={handleLoadMore}
                className="btn-secondary"
              >
                Load More Logs
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogMonitoringPage;