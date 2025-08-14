// Security events monitoring page with modern design
import React, { useEffect, useState, useCallback } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../../styles/datepicker.css';
import { ko } from 'date-fns/locale';
import { 
  Activity, 
  Filter, 
  Download,
  RefreshCw,
  Shield,
  AlertTriangle,
  Clock,
  Globe,
  Search,
  Wifi,
  WifiOff,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Server,
  FileJson,
  Calendar,
  ChevronDown,
  AlertCircle,
  ShieldCheck,
  Ban,
  CheckCircle,
  ExternalLink,
  Eye,
  Copy,
  Zap
} from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { apiClient } from '../../utils/api';

interface SecurityEvent {
  id: string;
  timestamp: string;
  source_ip: string;
  source_port?: number;
  destination_ip?: string;
  destination_port?: number;
  target_website?: string;
  uri: string;
  method: string;
  status_code: number;
  attack_type?: string;
  severity: string;
  is_blocked: boolean;
  risk_score: number;
  user_agent?: string;
  country?: string;
  anomaly_score?: number;
  rules_matched?: any[];
  rule_files?: string[];
  request_headers?: any;
  response_headers?: any;
  request_body?: string;
  response_body?: string;
  raw_audit_log?: any;
  geo_location?: any;
}

interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export const SecurityEventsPage: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ min: '2025-08-14T04:31', max: new Date().toISOString().slice(0, 16) });
  const { isConnected, lastMessage } = useWebSocket('/api/security-events/stream');
  
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 0
  });

  const [filters, setFilters] = useState({
    search: '',
    attackType: '',
    severity: '',
    blocked: '',
    sourceIp: '',
    destinationIp: '',
    domain: '',
    statusCode: '',
    dateFrom: '',
    dateTo: '',
    method: '',
    riskScore: ''
  });

  // Attack types for dropdown
  const attackTypes = [
    { value: '', label: 'All Types' },
    { value: 'XSS', label: 'Cross-Site Scripting (XSS)' },
    { value: 'SQLI', label: 'SQL Injection' },
    { value: 'LFI', label: 'Local File Inclusion' },
    { value: 'RFI', label: 'Remote File Inclusion' },
    { value: 'RCE', label: 'Remote Code Execution' },
    { value: 'PHP', label: 'PHP Injection' },
    { value: 'NODEJS', label: 'Node.js Attack' },
    { value: 'JAVA', label: 'Java Attack' },
    { value: 'SCANNER', label: 'Scanner Detection' },
    { value: 'SESSION', label: 'Session Attack' },
    { value: 'XXE', label: 'XML External Entity' }
  ];

  // Severity levels
  const severityLevels = [
    { value: '', label: 'All Severities' },
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
  ];

  // HTTP Methods
  const httpMethods = [
    { value: '', label: 'All Methods' },
    { value: 'GET', label: 'GET' },
    { value: 'POST', label: 'POST' },
    { value: 'PUT', label: 'PUT' },
    { value: 'DELETE', label: 'DELETE' },
    { value: 'PATCH', label: 'PATCH' },
    { value: 'HEAD', label: 'HEAD' },
    { value: 'OPTIONS', label: 'OPTIONS' }
  ];

  // Handle real-time events
  useEffect(() => {
    if (lastMessage?.type === 'critical_event') {
      loadEvents();
      
      if (lastMessage.data) {
        const event = lastMessage.data;
        const notification = {
          id: `notif_${Date.now()}`,
          type: event.is_blocked ? 'blocked' : 'critical' as 'blocked' | 'critical',
          title: `${event.attack_type || 'Attack'} ${event.is_blocked ? 'Blocked' : 'Detected'}`,
          message: `From ${event.source_ip} - Severity: ${event.severity}`,
          timestamp: new Date().toISOString(),
          read: false,
          eventId: event.id
        };
        
        const stored = localStorage.getItem('waf_notifications');
        const notifications = stored ? JSON.parse(stored) : [];
        notifications.unshift(notification);
        localStorage.setItem('waf_notifications', JSON.stringify(notifications.slice(0, 10)));
        localStorage.removeItem('waf_notifications_cleared');
        
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'waf_notifications',
          newValue: localStorage.getItem('waf_notifications'),
          storageArea: localStorage
        }));
      }
    }
  }, [lastMessage]);

  // Track if filters should be applied
  const [shouldApplyFilters, setShouldApplyFilters] = useState(false);

  // Load events when filters are applied or pagination changes
  useEffect(() => {
    loadEvents();
  }, [pagination.page, shouldApplyFilters]);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('auth_token');
      if (token) {
        apiClient.setToken(token);
      }
      
      const queryParams = new URLSearchParams();
      queryParams.append('page', pagination.page.toString());
      queryParams.append('page_size', pagination.page_size.toString());
      
      // Apply filters
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.attackType) queryParams.append('attack_type', filters.attackType);
      if (filters.severity) queryParams.append('severity', filters.severity);
      if (filters.blocked) queryParams.append('blocked_only', filters.blocked);
      if (filters.sourceIp) queryParams.append('source_ip', filters.sourceIp);
      if (filters.destinationIp) queryParams.append('destination_ip', filters.destinationIp);
      if (filters.domain) queryParams.append('domain', filters.domain);
      if (filters.dateFrom) queryParams.append('start_date', filters.dateFrom);
      if (filters.dateTo) queryParams.append('end_date', filters.dateTo);
      if (filters.method) queryParams.append('method', filters.method);
      
      const response = await fetch(`/api/security-events?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
        setPagination(data.pagination || {
          page: 1,
          page_size: 20,
          total: 0,
          total_pages: 0
        });
      } else {
        console.error('Failed to load events:', response.status);
        if (response.status === 401 || response.status === 422) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('user_info');
          window.location.href = '/login';
        }
      }
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.page_size, filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, page: 1 });
  };

  const applyFilters = () => {
    setShouldApplyFilters(true);
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      attackType: '',
      severity: '',
      blocked: '',
      sourceIp: '',
      destinationIp: '',
      domain: '',
      statusCode: '',
      dateFrom: '',
      dateTo: '',
      method: '',
      riskScore: ''
    });
    setPagination({ ...pagination, page: 1 });
    setShouldApplyFilters(true);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400';
      case 'high': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getAttackTypeIcon = (type?: string) => {
    if (!type) return null;
    switch (type) {
      case 'XSS':
      case 'SQLI':
      case 'RCE':
        return <Zap className="w-3 h-3 text-red-500" />;
      default:
        return <Shield className="w-3 h-3 text-yellow-500" />;
    }
  };

  const exportEvents = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        window.location.href = '/login';
        return;
      }
      
      const response = await fetch('/api/security-events/export', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `waf-security-log-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export events:', error);
    }
  };

  const openEventDetails = async (event: SecurityEvent) => {
    setSelectedEvent(event);
    
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        window.location.href = '/login';
        return;
      }
      
      const response = await fetch(`/api/security-events/${event.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const detailedEvent = await response.json();
        setSelectedEvent(detailedEvent);
      }
    } catch (error) {
      console.error('Failed to fetch event details:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="mb-6">
          <h1 className="section-title">Recent Security Events</h1>
          <p className="text-gray-500 dark:text-gray-600">Real-time monitoring and analysis</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
            isConnected ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'
          }`}>
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300">Offline</span>
              </>
            )}
          </div>
          
          {/* Actions */}
          <button
            onClick={() => loadEvents()}
            className="btn btn-secondary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={exportEvents}
            className="btn btn-primary"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="card">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-800">Filters</h2>
            {Object.values(filters).some(v => v) && (
              <span className="px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary rounded-full">
                Active
              </span>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
        
        {showFilters && (
          <div className="p-4 space-y-4">
            {/* Quick Time Range */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const now = new Date();
                  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
                  handleFilterChange('dateFrom', oneHourAgo.toISOString().slice(0, 16));
                  handleFilterChange('dateTo', now.toISOString().slice(0, 16));
                }}
                className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Last Hour
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
                  handleFilterChange('dateFrom', yesterday.toISOString().slice(0, 16));
                  handleFilterChange('dateTo', now.toISOString().slice(0, 16));
                }}
                className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Last 24 Hours
              </button>
              <button
                onClick={() => {
                  const now = new Date();
                  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                  handleFilterChange('dateFrom', weekAgo.toISOString().slice(0, 16));
                  handleFilterChange('dateTo', now.toISOString().slice(0, 16));
                }}
                className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Last 7 Days
              </button>
              <button
                onClick={() => {
                  handleFilterChange('dateFrom', '');
                  handleFilterChange('dateTo', '');
                }}
                className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                All Time
              </button>
            </div>

            {/* Filter Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search IP, URI, domain..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="input-field pl-10"
                />
              </div>

              {/* Attack Type */}
              <select
                value={filters.attackType}
                onChange={(e) => handleFilterChange('attackType', e.target.value)}
                className="input-field"
              >
                {attackTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>

              {/* Severity */}
              <select
                value={filters.severity}
                onChange={(e) => handleFilterChange('severity', e.target.value)}
                className="input-field"
              >
                {severityLevels.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>

              {/* Status */}
              <select
                value={filters.blocked}
                onChange={(e) => handleFilterChange('blocked', e.target.value)}
                className="input-field"
              >
                <option value="">All Status</option>
                <option value="true">Blocked Only</option>
                <option value="false">Allowed Only</option>
              </select>

              {/* Source IP */}
              <input
                type="text"
                placeholder="Source IP"
                value={filters.sourceIp}
                onChange={(e) => handleFilterChange('sourceIp', e.target.value)}
                className="input-field"
              />

              {/* Method */}
              <select
                value={filters.method}
                onChange={(e) => handleFilterChange('method', e.target.value)}
                className="input-field"
              >
                {httpMethods.map(method => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>

              {/* Date From */}
              <div className="relative">
                <DatePicker
                  selected={filters.dateFrom ? new Date(filters.dateFrom) : null}
                  onChange={(date) => handleFilterChange('dateFrom', date ? date.toISOString() : '')}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="yyyy-MM-dd HH:mm"
                  locale={ko}
                  placeholderText="Start Date"
                  className="input-field w-full"
                  minDate={new Date(dateRange.min)}
                  maxDate={new Date()}
                  popperPlacement="bottom-start"
                />
              </div>

              {/* Date To */}
              <div className="relative">
                <DatePicker
                  selected={filters.dateTo ? new Date(filters.dateTo) : null}
                  onChange={(date) => handleFilterChange('dateTo', date ? date.toISOString() : '')}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="yyyy-MM-dd HH:mm"
                  locale={ko}
                  placeholderText="End Date"
                  className="input-field w-full"
                  minDate={filters.dateFrom ? new Date(filters.dateFrom) : new Date(dateRange.min)}
                  maxDate={new Date()}
                  popperPlacement="bottom-start"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              <button
                onClick={clearFilters}
                className="btn btn-secondary"
              >
                Clear Filters
              </button>
              <button
                onClick={applyFilters}
                className="btn btn-primary"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Events Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20"></div>
              <div className="absolute inset-0 animate-spin rounded-full h-12 w-12 border-t-4 border-primary"></div>
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Shield className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-600">No security events found</p>
            <button
              onClick={clearFilters}
              className="mt-4 btn btn-secondary"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Request</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Attack</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Severity</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Risk</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                    onClick={() => openEventDetails(event)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {new Date(event.timestamp).toLocaleTimeString('ko-KR')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(event.timestamp).toLocaleDateString('ko-KR')}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-mono text-gray-900 dark:text-gray-100">
                            {event.source_ip}
                          </div>
                          {event.country && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {event.country}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                          {event.method}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-400 truncate max-w-xs" title={event.uri}>
                          {event.uri}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Status: {event.status_code}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {event.attack_type ? (
                        <div className="flex items-center gap-2">
                          {getAttackTypeIcon(event.attack_type)}
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {event.attack_type}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(event.severity)}`}>
                        {event.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {event.is_blocked ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-full">
                          <Ban className="w-3 h-3" />
                          Blocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400 rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Allowed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              event.risk_score >= 70 ? 'bg-red-500' :
                              event.risk_score >= 40 ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(100, event.risk_score)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          {event.risk_score}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEventDetails(event);
                        }}
                      >
                        <Eye className="w-4 h-4 text-gray-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination({ ...pagination, page: 1 })}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-1">
                {[...Array(Math.min(5, pagination.total_pages))].map((_, i) => {
                  let pageNum;
                  if (pagination.total_pages <= 5) {
                    pageNum = i + 1;
                  } else if (pagination.page <= 3) {
                    pageNum = i + 1;
                  } else if (pagination.page >= pagination.total_pages - 2) {
                    pageNum = pagination.total_pages - 4 + i;
                  } else {
                    pageNum = pagination.page - 2 + i;
                  }
                  
                  return (
                    <button
                      key={i}
                      onClick={() => setPagination({ ...pagination, page: pageNum })}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        pagination.page === pageNum
                          ? 'bg-primary text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPagination({ ...pagination, page: Math.min(pagination.total_pages, pagination.page + 1) })}
                disabled={pagination.page === pagination.total_pages}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.total_pages })}
                disabled={pagination.page === pagination.total_pages}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {pagination.page} of {pagination.total_pages} • {pagination.total} events
            </div>
          </div>
        )}
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedEvent(null)}
        >
          <div 
            className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-800">
                Event Details
              </h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Event ID</label>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-gray-900 dark:text-white font-mono">{selectedEvent.id}</p>
                      <button
                        onClick={() => copyToClipboard(selectedEvent.id)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        <Copy className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Timestamp</label>
                    <p className="text-gray-900 dark:text-white mt-1">
                      {new Date(selectedEvent.timestamp).toLocaleString('ko-KR')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Source IP</label>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-gray-900 dark:text-white font-mono">
                        {selectedEvent.source_ip}:{selectedEvent.source_port || 'N/A'}
                      </p>
                      <button
                        onClick={() => copyToClipboard(selectedEvent.source_ip)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        <Copy className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Destination</label>
                    <p className="text-gray-900 dark:text-white mt-1 font-mono">
                      {selectedEvent.destination_ip || 'N/A'}:{selectedEvent.destination_port || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Request Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Request Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Method & URI</label>
                    <p className="text-gray-900 dark:text-white mt-1 font-mono">
                      {selectedEvent.method} {selectedEvent.uri}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Status Code</label>
                    <p className="text-gray-900 dark:text-white mt-1">{selectedEvent.status_code}</p>
                  </div>
                  {selectedEvent.user_agent && (
                    <div>
                      <label className="text-sm text-gray-500 dark:text-gray-400">User Agent</label>
                      <p className="text-gray-900 dark:text-white mt-1 text-sm">{selectedEvent.user_agent}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Security Analysis */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Security Analysis</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Attack Type</label>
                    <p className="text-gray-900 dark:text-white mt-1">
                      {selectedEvent.attack_type || 'None detected'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Severity</label>
                    <span className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(selectedEvent.severity)}`}>
                      {selectedEvent.severity}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Risk Score</label>
                    <p className="text-gray-900 dark:text-white mt-1">{selectedEvent.risk_score}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400">Anomaly Score</label>
                    <p className="text-gray-900 dark:text-white mt-1">{selectedEvent.anomaly_score || 0}</p>
                  </div>
                </div>
              </div>

              {/* Raw Log */}
              {selectedEvent.raw_audit_log && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Raw Audit Log</h3>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(selectedEvent.raw_audit_log, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};