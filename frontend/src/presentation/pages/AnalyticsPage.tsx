// Analytics page with modern Apple-inspired design
import React, { useState, useEffect, useCallback } from 'react';
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
import { apiClient } from '../../utils/api';
import { useNavigate } from 'react-router-dom';

interface AnalyticsData {
  total_requests: number;
  blocked_requests: number;
  attack_requests: number;
  block_rate: number;
  top_attack_types: Array<{ type: string; count: number }>;
  top_source_ips: Array<{ ip: string; count: number; country?: string }>;
  hourly_trends?: Array<{ hour: string; total: number; blocked: number; attacks: number }>;
  severity_distribution?: Array<{ name: string; value: number }>;
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
      const token = localStorage.getItem('auth_token');
      if (token) {
        apiClient.setToken(token);
      }

      let timeRange = presetRange;
      if (dateRangeType === 'custom' && customStartDate && customEndDate) {
        timeRange = 'custom';
      }

      const response = await apiClient.getWafStats(timeRange);
      if (response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
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
          <p className="text-gray-500 dark:text-gray-600">
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
              maxDate={new Date()}
              dateFormat="yyyy-MM-dd"
              locale={ko}
              placeholderText="Start Date"
              className="input-field"
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
              minDate={customStartDate}
              maxDate={new Date()}
              dateFormat="yyyy-MM-dd"
              locale={ko}
              placeholderText="End Date"
              className="input-field"
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

          {/* Traffic Trends Chart */}
          {stats.hourly_trends && stats.hourly_trends.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Traffic Trends
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stats.hourly_trends}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorBlocked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.danger} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={COLORS.danger} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="hour" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: 'none', 
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke={COLORS.primary} 
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="blocked" 
                    stroke={COLORS.danger} 
                    fillOpacity={1} 
                    fill="url(#colorBlocked)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.top_attack_types}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {stats.top_attack_types.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Severity Distribution
              </h3>
              {stats.severity_distribution && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.severity_distribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill={COLORS.primary} />
                  </BarChart>
                </ResponsiveContainer>
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
              {stats.method_stats && (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.method_stats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="method" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS.indigo} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Response Codes */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Response Codes
              </h3>
              {stats.response_codes && (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.response_codes}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ code, percent }) => `${code} (${((percent || 0) * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {stats.response_codes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;