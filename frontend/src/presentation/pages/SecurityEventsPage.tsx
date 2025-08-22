import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import { 
  Activity, 
  Filter, 
  Download,
  RefreshCw,
  Wifi,
  WifiOff,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  AlertCircle,
  ShieldCheck
} from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import { apiClient } from '../../services/apiClient';
import EventTable from '../components/SecurityEvents/EventTable';
import EventDetailsModal from '../components/SecurityEvents/EventDetailsModal';
import type { SecurityEvent } from '../../types/SecurityEvent';

interface Filters {
  search: string;
  attackType: string;
  severity: string;
  blocked: string;
  sourceIp: string;
  statusCode: string;
  dateFrom: string;
  dateTo: string;
  method: string;
  riskScore: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface SecurityNotification {
  id: string;
  timestamp: string;
  source_ip: string;
  attack_type?: string;
  severity: string;
}

const SecurityEventsPage: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    attackType: '',
    severity: '',
    blocked: '',
    sourceIp: '',
    statusCode: '',
    dateFrom: '',
    dateTo: '',
    method: '',
    riskScore: ''
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0
  });
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  // dateRange will be set based on actual log data when first loaded
  const [dateRange, setDateRange] = useState({ 
    min: '', 
    max: '' 
  });
  const [notifications, setNotifications] = useState<SecurityNotification[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [shouldApplyFilters, setShouldApplyFilters] = useState(false);
  const loadingRef = useRef(false);

  const { lastMessage, isConnected } = useWebSocket('/api/ws/security-events');

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  // Handle 403 error
  const handle403Error = useCallback(() => {
    localStorage.removeItem('auth_token');
    navigate('/login');
  }, [navigate]);

  // Constants
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

  const severityLevels = [
    { value: '', label: 'All Severities' },
    { value: 'critical', label: 'Critical' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' }
  ];

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
        const notification: SecurityNotification = {
          id: `notif_${Date.now()}`,
          timestamp: event.timestamp,
          source_ip: event.source_ip,
          attack_type: event.attack_type,
          severity: event.severity
        };
        
        setNotifications(prev => [notification, ...prev].slice(0, 5));
        
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, 5000);
      }
    }
  }, [lastMessage]);

  // Load events with debouncing to prevent multiple simultaneous calls
  const loadEvents = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const params: Record<string, any> = {
        page: pagination.page,
        page_size: pagination.pageSize
      };
      
      if (filters.search) params.search = filters.search;
      if (filters.attackType) params.attack_type = filters.attackType;
      if (filters.severity) params.severity = filters.severity;
      if (filters.blocked) params.blocked_only = filters.blocked;
      if (filters.sourceIp) params.source_ip = filters.sourceIp;
      if (filters.statusCode) params.status_code = filters.statusCode;
      if (filters.dateFrom) params.start_date = filters.dateFrom;
      if (filters.dateTo) params.end_date = filters.dateTo;
      if (filters.method) params.method = filters.method;
      if (filters.riskScore) params.risk_score = filters.riskScore;

      const data = await apiClient.get<any>('/security-events', params);
      
      setEvents(data.events || []);
      setPagination({
        ...pagination,
        total: data.pagination?.total || 0,
        totalPages: data.pagination?.total_pages || 0
      });
      
      if (!dateRange.min && data.events?.length > 0) {
        const dates = data.events.map((e: SecurityEvent) => new Date(e.timestamp).getTime());
        const minDate = new Date(Math.min(...dates)).toISOString();
        const maxDate = new Date(Math.max(...dates)).toISOString();
        
        setDateRange({
          min: minDate,
          max: maxDate
        });
        
        // Also set the filter dates if they're empty
        if (!filters.dateFrom && !filters.dateTo) {
          setFilters(prev => ({
            ...prev,
            dateFrom: minDate,
            dateTo: maxDate
          }));
        }
      }
    } catch (error: any) {
      console.error('Failed to load events:', error);
      if (error?.status === 403 || error?.status === 401) {
        handle403Error();
      }
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [pagination.page, pagination.pageSize, filters, dateRange.min, handle403Error]);

  useEffect(() => {
    loadEvents();
  }, [pagination.page, pagination.pageSize]);

  useEffect(() => {
    if (shouldApplyFilters) {
      // Prevent race condition by using functional update
      setPagination(prev => ({ ...prev, page: 1 }));
      setShouldApplyFilters(false);
      // Load events after state update
      setTimeout(() => loadEvents(), 0);
    }
  }, [shouldApplyFilters]);

  // Filter handlers
  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
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
      statusCode: '',
      dateFrom: '',
      dateTo: '',
      method: '',
      riskScore: ''
    });
    setShouldApplyFilters(true);
  };

  // Event details
  const openEventDetails = async (event: SecurityEvent) => {
    try {
      const detailedEvent = await apiClient.get<SecurityEvent>(`/security-events/${event.id}`);
      setSelectedEvent(detailedEvent);
    } catch (error: any) {
      console.error('Failed to fetch event details:', error);
      if (error?.status === 403 || error?.status === 401) {
        handle403Error();
        return;
      }
      setSelectedEvent(event);
    }
  };

  // Export
  const exportEvents = async () => {
    try {
      const params: Record<string, any> = {};
      if (filters.search) params.search = filters.search;
      if (filters.attackType) params.attack_type = filters.attackType;
      if (filters.severity) params.severity = filters.severity;
      if (filters.blocked) params.blocked_only = filters.blocked;
      if (filters.sourceIp) params.source_ip = filters.sourceIp;
      if (filters.dateFrom) params.start_date = filters.dateFrom;
      if (filters.dateTo) params.end_date = filters.dateTo;

      // Need to use fetch for blob response
      const url = new URL(`${window.location.origin}/api/security-events/export`);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });

      const token = localStorage.getItem('auth_token');
      const response = await fetch(url.toString(), {
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        }
      });
      
      if (response.status === 403) {
        handle403Error();
        return;
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `security-events-${new Date().toISOString()}.csv`;
      a.click();
    } catch (error) {
      console.error('Failed to export events:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="mb-6">
          <h1 className="section-title">Recent Security Events</h1>
          <p className="text-gray-500 dark:text-gray-400">Real-time monitoring and analysis</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Offline</span>
              </>
            )}
          </div>

          {/* Export Button */}
          <button
            onClick={exportEvents}
            className="btn btn-secondary"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>

          {/* Refresh Button */}
          <button
            onClick={loadEvents}
            className="btn btn-primary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center justify-between animate-slide-in"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Critical Event Detected
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400">
                    {notification.attack_type} from {notification.source_ip}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card-no-stack">
        <div className="p-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          
          {showFilters && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Search */}
              <input
                type="text"
                placeholder="Search..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="input-field"
              />

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

              {/* Blocked */}
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
              <div className="datepicker-wrapper">
                <DatePicker
                  selected={filters.dateFrom ? new Date(filters.dateFrom) : null}
                  onChange={(date) => {
                    handleFilterChange('dateFrom', date ? date.toISOString() : '');
                  }}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Start Date"
                  className="datepicker-input"
                  wrapperClassName="datepicker-wrapper-inner"
                  isClearable
                  selectsStart
                  startDate={filters.dateFrom ? new Date(filters.dateFrom) : null}
                  endDate={filters.dateTo ? new Date(filters.dateTo) : null}
                  maxDate={new Date()}
                  popperPlacement="bottom-start"
                  popperClassName="datepicker-popper-custom"
                  popperContainer={({ children }) => (
                    <div style={{ position: 'fixed', zIndex: 55 }}>{children}</div>
                  )}
                />
              </div>

              {/* Date To */}
              <div className="datepicker-wrapper">
                <DatePicker
                  selected={filters.dateTo ? new Date(filters.dateTo) : null}
                  onChange={(date) => {
                    handleFilterChange('dateTo', date ? date.toISOString() : '');
                  }}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="End Date"
                  className="datepicker-input"
                  wrapperClassName="datepicker-wrapper-inner"
                  isClearable
                  selectsEnd
                  startDate={filters.dateFrom ? new Date(filters.dateFrom) : null}
                  endDate={filters.dateTo ? new Date(filters.dateTo) : null}
                  minDate={filters.dateFrom ? new Date(filters.dateFrom) : null}
                  maxDate={new Date()}
                  popperPlacement="bottom-start"
                  popperClassName="datepicker-popper-custom"
                  popperContainer={({ children }) => (
                    <div style={{ position: 'fixed', zIndex: 55 }}>{children}</div>
                  )}
                />
              </div>

              {/* Filter Buttons */}
              <div className="flex gap-2 col-span-full lg:col-span-2">
                <button
                  onClick={applyFilters}
                  className="btn btn-primary flex-1"
                >
                  Apply Filters
                </button>
                <button
                  onClick={clearFilters}
                  className="btn btn-secondary flex-1"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Events Table */}
      <EventTable 
        events={events}
        loading={loading}
        onEventClick={openEventDetails}
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} events
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination({ ...pagination, page: 1 })}
              disabled={pagination.page === 1}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page === pagination.totalPages}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPagination({ ...pagination, page: pagination.totalPages })}
              disabled={pagination.page === pagination.totalPages}
              className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      <EventDetailsModal
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
};

export default SecurityEventsPage;