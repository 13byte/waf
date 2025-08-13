// Security events monitoring page with real-time updates and advanced filtering
import React, { useEffect, useState, useCallback } from 'react';
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
  ChevronDown
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
  const [showFilters, setShowFilters] = useState(true);
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

  // Handle important security events only
  useEffect(() => {
    if (lastMessage) {
      // Only refresh for critical events (HIGH severity or BLOCKED)
      if (lastMessage.type === 'critical_event') {
        // Immediately refresh for critical events
        loadEvents();
        
        // Add notification for critical event
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
          
          // Add to notifications
          const stored = localStorage.getItem('waf_notifications');
          const notifications = stored ? JSON.parse(stored) : [];
          notifications.unshift(notification);
          localStorage.setItem('waf_notifications', JSON.stringify(notifications.slice(0, 10)));
          
          // Clear the cleared flag since we're adding new notifications
          localStorage.removeItem('waf_notifications_cleared');
          
          // Trigger custom storage event for NotificationBell
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'waf_notifications',
            newValue: localStorage.getItem('waf_notifications'),
            storageArea: localStorage
          }));
        }
      }
    }
  }, [lastMessage]);

  // Load events when filters or pagination changes
  useEffect(() => {
    loadEvents();
  }, [pagination.page]);

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      
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
      }
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.page_size, filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, page: 1 }); // Reset to first page on filter change
  };

  const applyFilters = () => {
    loadEvents();
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
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      case 'high': return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20';
      case 'low': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
    }
  };

  const getAttackTypeIcon = (type?: string) => {
    if (!type) return <Shield className="w-4 h-4" />;
    switch (type) {
      case 'XSS':
      case 'SQLI':
      case 'RCE':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Shield className="w-4 h-4 text-yellow-500" />;
    }
  };

  const exportEvents = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      
      // Fetch all events without pagination
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
    // First set the basic event to show modal immediately
    setSelectedEvent(event);
    
    // Then fetch detailed event data with raw log
    try {
      const response = await fetch(`/api/security-events/${event.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      
      if (response.ok) {
        const detailedEvent = await response.json();
        // Update with detailed data including raw log
        setSelectedEvent(detailedEvent);
      }
    } catch (error) {
      console.error('Failed to fetch event details:', error);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Security Events Monitor
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Real-time security event monitoring and analysis
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {isConnected ? (
              <div className="flex items-center text-green-600 dark:text-green-400">
                <Wifi className="w-4 h-4 mr-1" />
                <span className="text-sm">Live</span>
              </div>
            ) : (
              <div className="flex items-center text-red-600 dark:text-red-400">
                <WifiOff className="w-4 h-4 mr-1" />
                <span className="text-sm">Disconnected</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Filters</h2>
              {Object.values(filters).some(v => v) && (
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-full">
                  Active
                </span>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
        
        {showFilters && (
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    placeholder="IP, URI, User Agent..."
                    className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Attack Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Attack Type
                </label>
                <select
                  value={filters.attackType}
                  onChange={(e) => handleFilterChange('attackType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {attackTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Severity
                </label>
                <select
                  value={filters.severity}
                  onChange={(e) => handleFilterChange('severity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {severityLevels.map(level => (
                    <option key={level.value} value={level.value}>{level.label}</option>
                  ))}
                </select>
              </div>

              {/* Blocked Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={filters.blocked}
                  onChange={(e) => handleFilterChange('blocked', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">All Events</option>
                  <option value="true">Blocked Only</option>
                  <option value="false">Allowed Only</option>
                </select>
              </div>

              {/* Source IP */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Source IP
                </label>
                <input
                  type="text"
                  value={filters.sourceIp}
                  onChange={(e) => handleFilterChange('sourceIp', e.target.value)}
                  placeholder="192.168.1.1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Destination IP */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Destination IP
                </label>
                <input
                  type="text"
                  value={filters.destinationIp}
                  onChange={(e) => handleFilterChange('destinationIp', e.target.value)}
                  placeholder="10.0.0.1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Domain */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Domain
                </label>
                <input
                  type="text"
                  value={filters.domain}
                  onChange={(e) => handleFilterChange('domain', e.target.value)}
                  placeholder="example.com"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* HTTP Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Method
                </label>
                <select
                  value={filters.method}
                  onChange={(e) => handleFilterChange('method', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {httpMethods.map(method => (
                    <option key={method.value} value={method.value}>{method.label}</option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date From
                </label>
                <input
                  type="datetime-local"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Date To
                </label>
                <input
                  type="datetime-local"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            {/* Filter Actions */}
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Clear All
              </button>
              <button
                onClick={applyFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Events Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing {events.length} of {pagination.total} events
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadEvents}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <RefreshCw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
            <button
              onClick={exportEvents}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <Download className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            No security events found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-3 text-left w-[160px]">Time</th>
                  <th className="px-3 py-3 text-left w-[150px]">Source</th>
                  <th className="px-3 py-3 text-left w-[150px]">Dest</th>
                  <th className="px-3 py-3 text-left w-[300px]">Request</th>
                  <th className="px-3 py-3 text-left w-[100px]">Attack</th>
                  <th className="px-3 py-3 text-left w-[80px]">Severity</th>
                  <th className="px-3 py-3 text-center w-[80px]">Status</th>
                  <th className="px-3 py-3 text-center w-[100px]">Risk</th>
                  <th className="px-3 py-3 text-center w-[60px]">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {events.map((event) => (
                  <tr 
                    key={event.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => openEventDetails(event)}
                  >
                    <td className="px-3 py-2 text-xs">
                      <div className="text-gray-900 dark:text-white">
                        {new Date(event.timestamp).toLocaleString('ko-KR', { 
                          year: '2-digit',
                          month: '2-digit', 
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div className="text-gray-900 dark:text-white font-mono truncate" title={`${event.source_ip}${event.source_port ? `:${event.source_port}` : ''}`}>
                        {event.source_ip}{event.source_port ? `:${event.source_port}` : ''}
                      </div>
                      {event.country && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {event.country}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div className="text-gray-900 dark:text-white font-mono truncate" title={`${event.destination_ip || 'N/A'}${event.destination_port ? `:${event.destination_port}` : ''}`}>
                        {event.destination_ip || 'N/A'}{event.destination_port ? `:${event.destination_port}` : ''}
                      </div>
                      {event.target_website && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate" title={event.target_website}>
                          {event.target_website}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div className="flex items-center space-x-1">
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded flex-shrink-0">
                          {event.method}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 truncate" title={event.uri}>
                          {event.uri}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Status: {event.status_code}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {event.attack_type ? (
                        <div className="flex items-center space-x-1">
                          {getAttackTypeIcon(event.attack_type)}
                          <span className="text-gray-900 dark:text-white">
                            {event.attack_type}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(event.severity)}`}>
                        {event.severity}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-center">
                      {event.is_blocked ? (
                        <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400 rounded-full">
                          Blocked
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400 rounded-full">
                          Allowed
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-center">
                      <div className="flex items-center justify-center">
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              event.risk_score >= 70 ? 'bg-red-600' :
                              event.risk_score >= 40 ? 'bg-yellow-600' :
                              'bg-green-600'
                            }`}
                            style={{ width: `${Math.min(100, event.risk_score)}%` }}
                          />
                        </div>
                        <span className="ml-2 text-xs text-gray-600 dark:text-gray-400">
                          {event.risk_score.toFixed(0)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-center">
                      <button
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEventDetails(event);
                        }}
                      >
                        <ChevronRight className="w-4 h-4" />
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
            <div className="flex items-center space-x-2">
              {/* First Page */}
              <button
                onClick={() => setPagination({ ...pagination, page: 1 })}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400"
                title="First page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              
              {/* Previous Page */}
              <button
                onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
                disabled={pagination.page === 1}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="flex items-center space-x-1">
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
                      className={`px-3 py-1 rounded-lg ${
                        pagination.page === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Page */}
              <button
                onClick={() => setPagination({ ...pagination, page: Math.min(pagination.total_pages, pagination.page + 1) })}
                disabled={pagination.page === pagination.total_pages}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              
              {/* Last Page */}
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.total_pages })}
                disabled={pagination.page === pagination.total_pages}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-600 dark:text-gray-400"
                title="Last page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {pagination.page} of {pagination.total_pages}
            </div>
          </div>
        )}
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedEvent(null)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Event Details
              </h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Event ID</label>
                    <p className="text-gray-900 dark:text-white font-mono">{selectedEvent.id}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Timestamp</label>
                    <p className="text-gray-900 dark:text-white">
                      {new Date(selectedEvent.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Source</label>
                    <p className="text-gray-900 dark:text-white font-mono">
                      {selectedEvent.source_ip}:{selectedEvent.source_port || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Destination</label>
                    <p className="text-gray-900 dark:text-white font-mono">
                      {selectedEvent.destination_ip || 'N/A'}:{selectedEvent.destination_port || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Request Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Request Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Method</label>
                    <p className="text-gray-900 dark:text-white">{selectedEvent.method}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">URI</label>
                    <p className="text-gray-900 dark:text-white font-mono break-all">{selectedEvent.uri}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">User Agent</label>
                    <p className="text-gray-900 dark:text-white text-sm">{selectedEvent.user_agent || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Security Analysis */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Security Analysis</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Attack Type</label>
                    <p className="text-gray-900 dark:text-white">{selectedEvent.attack_type || 'None'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Severity</label>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(selectedEvent.severity)}`}>
                      {selectedEvent.severity}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Risk Score</label>
                    <p className="text-gray-900 dark:text-white">{selectedEvent.risk_score.toFixed(1)}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Anomaly Score</label>
                    <p className="text-gray-900 dark:text-white">{selectedEvent.anomaly_score || 0}</p>
                  </div>
                </div>
                
                {/* Rule Files */}
                {selectedEvent.rule_files && selectedEvent.rule_files.length > 0 && (
                  <div className="mt-4">
                    <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Triggered Rule Files (.conf)</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.rule_files.map((file: string, index: number) => (
                        <span key={index} className="px-2 py-1 text-xs font-mono bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                          {file}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Rules Matched */}
              {selectedEvent.rules_matched && selectedEvent.rules_matched.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Rules Matched</h3>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                    <pre className="text-sm text-gray-600 dark:text-gray-400 overflow-x-auto">
                      {JSON.stringify(selectedEvent.rules_matched, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Headers */}
              {selectedEvent.request_headers && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Request Headers</h3>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                    <pre className="text-sm text-gray-600 dark:text-gray-400 overflow-x-auto">
                      {JSON.stringify(selectedEvent.request_headers, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
              
              {/* Processed Event Data */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Processed Event Data</h3>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 max-h-96 overflow-auto">
                  <pre className="text-sm text-gray-600 dark:text-gray-400">
                    {JSON.stringify(
                      Object.fromEntries(
                        Object.entries(selectedEvent).filter(([key]) => key !== 'raw_audit_log')
                      ), 
                      null, 
                      2
                    )}
                  </pre>
                </div>
              </div>

              {/* Original Audit Log - moved to bottom */}
              {selectedEvent.raw_audit_log && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Raw Audit Log (Original Transaction)</h3>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 max-h-96 overflow-auto">
                    <pre className="text-sm text-gray-600 dark:text-gray-400 font-mono whitespace-pre-wrap">
                      {(() => {
                        try {
                          // Try to parse as JSON if it's a string
                          const parsed = typeof selectedEvent.raw_audit_log === 'string' 
                            ? JSON.parse(selectedEvent.raw_audit_log)
                            : selectedEvent.raw_audit_log;
                          return JSON.stringify(parsed, null, 2);
                        } catch (e) {
                          // If parsing fails, display as raw text
                          return selectedEvent.raw_audit_log;
                        }
                      })()}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};