// Analytics page with modern Apple-inspired design
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../../styles/datepicker.css';
import { ko } from 'date-fns/locale';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { 
  BarChart3, TrendingUp, Calendar, Download, Shield, 
  AlertTriangle, Globe, Clock, Activity, Zap, Target,
  Users, Server, RefreshCw, Info, ChevronDown, ChevronUp,
  ArrowUp, ArrowDown, Minus, Layers, ExternalLink
} from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { useNavigate } from 'react-router-dom';
import ChartErrorBoundary from '../../components/ChartErrorBoundary';

interface AnalyticsData {
  total_requests: number;
  blocked_requests: number;
  attack_requests: number;
  block_rate: number;
  top_attack_types: Array<{ type: string; count: number }>;
  top_source_ips: Array<{ ip: string; count: number; country?: string }>;
  hourly_trends?: Array<{ hour: string; total: number; blocked: number; attacks: number }>;
  severity_distribution?: Array<{ severity?: string; name?: string; count?: number; value?: number }>;
  country_stats?: Array<{ country: string; requests: number; attacks: number }>;
  method_stats?: Array<{ method: string; count: number }>;
  response_codes?: Array<{ code: string; count: number }>;
}

const AnalyticsPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Date range states
  const [dateRangeType, setDateRangeType] = useState<'preset' | 'custom'>('preset');
  const [presetRange, setPresetRange] = useState('7d');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  
  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30000);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Check for dark mode on mount and when theme changes
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };
    
    checkDarkMode();
    
    // Watch for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    return () => observer.disconnect();
  }, []);
  
  // Helper function to get theme-aware colors - now using state
  const chartColors = useMemo(() => ({
    text: isDarkMode ? '#9ca3af' : '#6b7280',
    grid: isDarkMode ? '#374151' : '#e5e7eb',
    tooltipBg: isDarkMode ? '#1f2937' : '#ffffff',
    tooltipText: isDarkMode ? '#f3f4f6' : '#111827',
    labelText: isDarkMode ? '#e5e7eb' : '#374151'
  }), [isDarkMode]);
  
  // Tooltip content style object - now using memoized values
  const tooltipStyle = useMemo(() => ({
    backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
    color: isDarkMode ? '#f3f4f6' : '#111827',
    border: isDarkMode ? '1px solid #374151' : '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    padding: '8px 12px'
  }), [isDarkMode]);

  // Chart colors
  const COLORS = {
    primary: '#0071E3',
    danger: '#EF4444',
    warning: '#F59E0B',
    success: '#10B981',
    purple: '#8B5CF6',
    pink: '#EC4899',
    indigo: '#6366F1',
    teal: '#14B8A6'
  };

  const CHART_COLORS = [
    COLORS.primary, COLORS.danger, COLORS.warning, COLORS.success,
    COLORS.purple, COLORS.pink, COLORS.indigo, COLORS.teal
  ];

  useEffect(() => {
    fetchAnalytics();
  }, [presetRange, customStartDate, customEndDate]);
  
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchAnalytics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Prepare date parameters based on selection
      let startDate: Date;
      let endDate = new Date();
      
      if (dateRangeType === 'custom' && customStartDate && customEndDate) {
        startDate = customStartDate;
        endDate = customEndDate;
      } else {
        // Calculate start date based on preset range
        if (presetRange === '1h') {
          startDate = new Date(Date.now() - 60 * 60 * 1000);
        } else if (presetRange === '24h') {
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        } else if (presetRange === '7d') {
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        } else {
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        }
      }

      const response = await apiClient.get<any>('/analytics/stats', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        period: 'hourly'
      });
      
      if (response) {
        // Process and format the data
        const processedData = {
          total_requests: response.summary?.total_requests || 0,
          blocked_requests: response.summary?.blocked_requests || 0,
          attack_requests: response.summary?.attack_requests || 0,
          block_rate: response.summary?.block_rate || 0,
          top_attack_types: response.attack_types || [],
          top_source_ips: response.top_ips || [],
          hourly_trends: response.hourly_stats || [],
          severity_distribution: response.severity_distribution || [],
          country_stats: response.country_stats || [],
          method_stats: response.method_stats || [],
          response_codes: response.response_codes || []
        };

        // Format hourly trends if they exist
        if (processedData.hourly_trends && processedData.hourly_trends.length > 0) {
          processedData.hourly_trends = processedData.hourly_trends.map((trend: any) => ({
            hour: trend.hour,  // Keep original ISO string for data
            hourLabel: formatHourLabel(trend.hour),  // Add formatted label for display
            total: trend.total_requests || 0,
            blocked: trend.blocked_requests || 0,
            attacks: trend.attack_requests || 0
          }));
        }

        setStats(processedData);
        
        // Try to get date range from the data
        // Note: This would be better if the backend provided the actual date range
        // For now, we'll let the DatePicker be fully flexible
      }
    } catch (error: any) {
      console.error('Failed to fetch analytics:', error);
      if (error?.status === 403 || error?.status === 401) {
        localStorage.removeItem('auth_token');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  // Format hour labels for display
  const formatHourLabel = (hour: string) => {
    // If it's an ISO date string
    if (hour.includes('T')) {
      const date = new Date(hour);
      // For 1 hour range, show time with minutes
      if (presetRange === '1h') {
        return date.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit' });
      }
      // For 24 hour range, show hour only
      if (presetRange === '24h') {
        return date.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit' });
      }
      // For 7 day range, show day and hour
      if (presetRange === '7d') {
        return date.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', day: 'numeric', hour: '2-digit' });
      }
      // For monthly data, show date
      return date.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: 'short', day: 'numeric' });
    }
    return hour;
  };

  const exportData = () => {
    if (!stats) return;
    
    const csvContent = `
WAF Analytics Report
Generated: ${new Date().toLocaleString()}
Time Range: ${presetRange}

Summary
Total Requests,${stats.total_requests}
Blocked Requests,${stats.blocked_requests}
Attack Requests,${stats.attack_requests}
Block Rate,${stats.block_rate}%

Top Attack Types
Type,Count
${stats.top_attack_types.map(t => `${t.type},${t.count}`).join('\n')}

Top Source IPs
IP,Count
${stats.top_source_ips.map(ip => `${ip.ip},${ip.count}`).join('\n')}
`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waf-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getChangeIcon = (value: number) => {
    if (value > 0) return <ArrowUp className="w-3 h-3" />;
    if (value < 0) return <ArrowDown className="w-3 h-3" />;
    return <Minus className="w-3 h-3" />;
  };

  const getChangeColor = (value: number) => {
    if (value > 0) return 'text-red-600 dark:text-red-400';
    if (value < 0) return 'text-green-600 dark:text-green-400';
    return 'text-gray-500 dark:text-gray-400';
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

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <AlertTriangle className="h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Failed to load analytics data</p>
        <button onClick={fetchAnalytics} className="mt-4 btn-primary">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="mb-6">
          <h1 className="section-title">Security Analytics</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Comprehensive metrics and insights
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Auto Refresh Toggle */}
          <div className="flex items-center gap-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
            </label>
            <span className="text-sm text-gray-600 dark:text-gray-400">Auto Refresh</span>
          </div>
          
          <button onClick={fetchAnalytics} className="btn btn-secondary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button onClick={exportData} className="btn btn-primary">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Calendar className="w-5 h-5 text-gray-500" />
            <div className="flex gap-2">
              {['1h', '24h', '7d', '30d'].map((range) => (
                <button
                  key={range}
                  onClick={() => {
                    setDateRangeType('preset');
                    setPresetRange(range);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    dateRangeType === 'preset' && presetRange === range
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {range === '1h' && 'Last Hour'}
                  {range === '24h' && 'Last 24 Hours'}
                  {range === '7d' && 'Last 7 Days'}
                  {range === '30d' && 'Last 30 Days'}
                </button>
              ))}
            </div>
          </div>
          
          {/* Custom Date Range */}
          <div className="flex items-center gap-2">
            <DatePicker
              selected={customStartDate}
              onChange={(date) => {
                setCustomStartDate(date);
                setDateRangeType('custom');
              }}
              selectsStart
              startDate={customStartDate}
              endDate={customEndDate}
              minDate={undefined}
              maxDate={customEndDate || new Date()}
              dateFormat="yyyy-MM-dd"
              locale={ko}
              placeholderText="Start Date"
              className="input-field"
              popperPlacement="bottom-start"
              withPortal
              portalId="root-portal"
            />
            <span className="text-gray-500">to</span>
            <DatePicker
              selected={customEndDate}
              onChange={(date) => {
                setCustomEndDate(date);
                setDateRangeType('custom');
              }}
              selectsEnd
              startDate={customStartDate}
              endDate={customEndDate}
              minDate={customStartDate || undefined}
              maxDate={new Date()}
              dateFormat="yyyy-MM-dd"
              locale={ko}
              placeholderText="End Date"
              className="input-field"
              popperPlacement="bottom-start"
              withPortal
              portalId="root-portal"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['overview', 'attacks', 'geography', 'performance'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl">
                  <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span className={`text-xs font-medium flex items-center gap-1 ${getChangeColor(12.5)}`}>
                  {getChangeIcon(12.5)}
                  12.5%
                </span>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.total_requests.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Total Requests</div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-xl">
                  <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <span className={`text-xs font-medium flex items-center gap-1 ${getChangeColor(-5.2)}`}>
                  {getChangeIcon(-5.2)}
                  5.2%
                </span>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.blocked_requests.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Blocked Attacks</div>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Block Rate: {stats.block_rate.toFixed(1)}%
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-xl">
                  <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
                <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400 animate-pulse" />
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.attack_requests.toLocaleString()}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Attack Attempts</div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl">
                  <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.top_source_ips?.length || 0}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Unique IPs</div>
            </div>
          </div>

          {/* Traffic Trends Chart with Error Boundary */}
          {stats.hourly_trends && stats.hourly_trends.length > 0 ? (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Traffic Trends
              </h3>
              <ChartErrorBoundary>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stats.hourly_trends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorAttacks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.warning} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={COLORS.warning} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis 
                      dataKey="hourLabel" 
                      stroke={chartColors.text}
                      tick={{ fontSize: 12, fill: chartColors.text }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      stroke={chartColors.text}
                      tick={{ fontSize: 12, fill: chartColors.text }}
                    />
                    <Tooltip 
                      contentStyle={tooltipStyle}
                      formatter={(value: any) => [value.toLocaleString(), '']}
                      labelFormatter={(label: string) => `Time: ${label}`}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={36}
                      iconType="circle"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      name="Total Requests"
                      stroke={COLORS.primary} 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorTotal)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="blocked" 
                      name="Blocked"
                      stroke={COLORS.danger} 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorBlocked)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="attacks" 
                      name="Attacks"
                      stroke={COLORS.warning} 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorAttacks)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartErrorBoundary>
            </div>
          ) : (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Traffic Trends
              </h3>
              <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No traffic data available for the selected period</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'attacks' && (
        <div className="space-y-6">
          {/* Attack Types Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Attack Types Distribution
              </h3>
              {stats.top_attack_types && stats.top_attack_types.length > 0 ? (
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.top_attack_types}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }) => {
                          const RADIAN = Math.PI / 180;
                          const radius = outerRadius + 30; // 라벨을 차트 밖으로 이동
                          const angle = midAngle ?? 0;
                          const x = cx + radius * Math.cos(-angle * RADIAN);
                          const y = cy + radius * Math.sin(-angle * RADIAN);
                          const total = stats.top_attack_types.reduce((sum, item) => sum + (item.count || 0), 0);
                          const percentValue = total > 0 ? ((payload?.count || 0) / total * 100).toFixed(0) : '0';
                          
                          // 5% 미만은 라벨 표시 안함
                          if (parseInt(percentValue) < 5) return null;
                          
                          return (
                            <text 
                              x={x} 
                              y={y} 
                              fill={isDarkMode ? '#9ca3af' : '#4b5563'}
                              textAnchor={x > cx ? 'start' : 'end'} 
                              dominantBaseline="central"
                              fontSize="11"
                              fontWeight="400"
                            >
                              {`${payload?.type || 'Unknown'} ${percentValue}%`}
                            </text>
                          );
                        }}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="type"
                      >
                        {stats.top_attack_types.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any, name: any) => [`${value.toLocaleString()} attacks`, name]}
                        contentStyle={tooltipStyle}
                        itemStyle={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}
                        labelStyle={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                  <p>No attack data available</p>
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Severity Distribution
              </h3>
              {stats.severity_distribution && stats.severity_distribution.length > 0 ? (
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.severity_distribution.map(item => {
                      // Handle both possible data structures from backend
                      const severity = item.severity || item.name || 'Unknown';
                      const count = item.count || item.value || 0;
                      return {
                        name: severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase(),
                        value: count,
                        originalSeverity: severity.toLowerCase()
                      };
                    })}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis dataKey="name" stroke={chartColors.text} tick={{ fill: chartColors.text }} />
                      <YAxis stroke={chartColors.text} tick={{ fill: chartColors.text }} />
                      <Tooltip 
                        formatter={(value: any, name: any) => [`${value.toLocaleString()}`, name]}
                        contentStyle={tooltipStyle}
                        itemStyle={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}
                        labelStyle={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}
                      />
                      <Bar dataKey="value" fill={COLORS.primary}>
                        {stats.severity_distribution.map((entry, index) => {
                          const severity = (entry.severity || entry.name || '').toLowerCase();
                          return (
                            <Cell key={`cell-${index}`} fill={
                              severity === 'critical' ? COLORS.danger :
                              severity === 'high' ? COLORS.warning :
                              severity === 'medium' ? COLORS.purple :
                              severity === 'low' ? COLORS.success :
                              COLORS.primary
                            } />
                          );
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                  <p>No severity data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Top Attack Sources */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Top Attack Sources
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Country
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Requests
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {stats.top_source_ips.slice(0, 10).map((ip, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        #{index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900 dark:text-gray-100">
                        {ip.ip}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          {ip.country || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {ip.count.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <button
                          onClick={() => navigate(`/security-events?source_ip=${ip.ip}`)}
                          className="text-primary hover:text-primary-dark transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'geography' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Traffic by Country
            </h3>
            {stats.country_stats && stats.country_stats.length > 0 ? (
              <div className="space-y-4">
                {stats.country_stats.slice(0, 10).map((country, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {country.country}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {country.attacks} attacks
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {country.requests.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">requests</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No geographic data available
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* HTTP Methods */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                HTTP Methods
              </h3>
              {stats.method_stats && stats.method_stats.length > 0 ? (
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={stats.method_stats}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis dataKey="method" stroke={chartColors.text} tick={{ fill: chartColors.text }} />
                      <YAxis stroke={chartColors.text} tick={{ fill: chartColors.text }} />
                      <Tooltip 
                        formatter={(value: any, name: any) => [`${value.toLocaleString()}`, name]}
                        contentStyle={tooltipStyle}
                        itemStyle={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}
                        labelStyle={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}
                      />
                      <Bar dataKey="count" fill={COLORS.indigo}>
                        {stats.method_stats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={
                            entry.method === 'GET' ? COLORS.primary :
                            entry.method === 'POST' ? COLORS.success :
                            entry.method === 'PUT' ? COLORS.warning :
                            entry.method === 'DELETE' ? COLORS.danger :
                            COLORS.purple
                          } />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                  <p>No method data available</p>
                </div>
              )}
            </div>

            {/* Response Codes */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Response Codes
              </h3>
              {stats.response_codes && stats.response_codes.length > 0 ? (
                <ChartErrorBoundary>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.response_codes}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }) => {
                          const RADIAN = Math.PI / 180;
                          const radius = outerRadius + 30; // 라벨을 차트 밖으로 이동
                          const angle = midAngle ?? 0;
                          const x = cx + radius * Math.cos(-angle * RADIAN);
                          const y = cy + radius * Math.sin(-angle * RADIAN);
                          const total = stats.response_codes?.reduce((sum, item) => sum + (item.count || 0), 0) || 0;
                          const percentValue = total > 0 ? ((payload?.count || 0) / total * 100).toFixed(0) : '0';
                          
                          // 5% 미만은 라벨 표시 안함
                          if (parseInt(percentValue) < 5) return null;
                          
                          return (
                            <text 
                              x={x} 
                              y={y} 
                              fill={isDarkMode ? '#9ca3af' : '#4b5563'}
                              textAnchor={x > cx ? 'start' : 'end'} 
                              dominantBaseline="central"
                              fontSize="11"
                              fontWeight="400"
                            >
                              {`${payload?.code || 'Unknown'} ${percentValue}%`}
                            </text>
                          );
                        }}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="code"
                      >
                        {stats.response_codes.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any, name: any) => [`${value.toLocaleString()} requests`, name]}
                        contentStyle={tooltipStyle}
                        itemStyle={{ color: isDarkMode ? '#f3f4f6' : '#111827' }}
                        labelStyle={{ color: isDarkMode ? '#9ca3af' : '#6b7280' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartErrorBoundary>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500 dark:text-gray-400">
                  <p>No response code data available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;