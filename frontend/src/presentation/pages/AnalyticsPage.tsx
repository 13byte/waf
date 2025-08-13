// Enhanced Analytics page with comprehensive data visualization
import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, 
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import { 
  BarChart3, TrendingUp, Calendar, Download, Filter, Shield, 
  AlertTriangle, Globe, Clock, Activity, Zap, Target, Eye,
  Users, Server, Database, Lock, Bug, FileWarning
} from 'lucide-react';
import { apiClient } from '../../utils/api';

interface AnalyticsData {
  total_requests: number;
  blocked_requests: number;
  attack_requests: number;
  block_rate: number;
  top_attack_types: Array<{ type: string; count: number }>;
  top_source_ips: Array<{ ip: string; count: number }>;
  hourly_stats?: Array<{ hour: string; total: number; blocked: number; attacks: number }>;
  daily_stats?: Array<{ date: string; total: number; blocked: number; attacks: number }>;
  severity_distribution?: Array<{ name: string; value: number }>;
  country_stats?: Array<{ country: string; requests: number; attacks: number }>;
  method_stats?: Array<{ method: string; count: number }>;
  response_codes?: Array<{ code: string; count: number }>;
}

const AnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [stats, setStats] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Chart colors
  const COLORS = {
    primary: '#3B82F6',
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
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await apiClient.getWafStats(timeRange);
      if (response.data) {
        // Use real data from backend
        const enhancedData = {
          ...response.data,
          // Use real hourly trends if available
          hourly_stats: response.data.hourly_trends ? 
            response.data.hourly_trends.map((h: any) => ({
              hour: new Date(h.hour).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              total: h.total,
              blocked: h.blocked,
              attacks: h.attacks
            })) : [],
          // Generate daily stats from hourly data
          daily_stats: response.data.hourly_trends ? 
            generateDailyStatsFromHourly(response.data.hourly_trends, timeRange) : 
            [],
          // Use real severity distribution
          severity_distribution: response.data.severity_distribution?.map((s: any) => ({
            name: s.severity?.charAt(0).toUpperCase() + s.severity?.slice(1).toLowerCase() || 'Unknown',
            value: s.count
          })) || [],
          // Use real data from backend
          country_stats: response.data.country_stats || [],
          method_stats: response.data.method_stats || [],
          response_codes: response.data.response_codes || []
        };
        setStats(enhancedData);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      // Minimal fallback with empty data
      setStats({
        total_requests: 0,
        blocked_requests: 0,
        attack_requests: 0,
        block_rate: 0,
        top_attack_types: [],
        top_source_ips: [],
        hourly_stats: [],
        daily_stats: [],
        severity_distribution: [],
        country_stats: [],
        method_stats: [],
        response_codes: []
      });
    }
    setLoading(false);
  };

  // Generate daily stats from hourly data
  const generateDailyStatsFromHourly = (hourlyTrends: any[], range: string) => {
    if (!hourlyTrends || hourlyTrends.length === 0) return [];
    
    // Group hourly data by date
    const dailyMap = new Map();
    
    hourlyTrends.forEach(hour => {
      const date = new Date(hour.hour);
      const dayKey = date.toDateString();
      
      if (!dailyMap.has(dayKey)) {
        dailyMap.set(dayKey, {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          total: 0,
          blocked: 0,
          attacks: 0
        });
      }
      
      const day = dailyMap.get(dayKey);
      day.total += hour.total || 0;
      day.blocked += hour.blocked || 0;
      day.attacks += hour.attacks || 0;
    });
    
    return Array.from(dailyMap.values()).sort((a, b) => 
      new Date(a.date + ' 2024').getTime() - new Date(b.date + ' 2024').getTime()
    );
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    
    return (
      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  };

  const renderOverviewTab = () => (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Total Requests
            </span>
            <Activity className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {stats?.total_requests?.toLocaleString() || 'N/A'}
          </div>
          <div className="mt-2 flex items-center text-xs text-gray-500">
            <TrendingUp className="w-3 h-3 mr-1" />
            <span>+12% from last period</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Blocked Attacks
            </span>
            <Shield className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-red-600 dark:text-red-400">
            {stats?.blocked_requests?.toLocaleString() || 'N/A'}
          </div>
          <div className="mt-2 flex items-center text-xs text-gray-500">
            <AlertTriangle className="w-3 h-3 mr-1" />
            <span>Critical threats prevented</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Block Rate
            </span>
            <Target className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
            {stats?.block_rate ? `${stats.block_rate.toFixed(1)}%` : 'N/A'}
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div 
                className="bg-yellow-500 h-1.5 rounded-full transition-all"
                style={{ width: `${stats?.block_rate || 0}%` }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Active Threats
            </span>
            <Bug className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
            {stats?.attack_requests?.toLocaleString() || 'N/A'}
          </div>
          <div className="mt-2 flex items-center text-xs text-red-500">
            <Zap className="w-3 h-3 mr-1" />
            <span>Requires attention</span>
          </div>
        </div>
      </div>

      {/* Traffic Overview Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Traffic Overview
        </h2>
        {stats?.daily_stats && stats.daily_stats.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={stats.daily_stats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Area type="monotone" dataKey="total" stackId="1" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.6} name="Total" />
              <Area type="monotone" dataKey="attacks" stackId="1" stroke={COLORS.warning} fill={COLORS.warning} fillOpacity={0.6} name="Attacks" />
              <Area type="monotone" dataKey="blocked" stackId="1" stroke={COLORS.danger} fill={COLORS.danger} fillOpacity={0.6} name="Blocked" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No traffic data available</p>
            </div>
          </div>
        )}
      </div>

      {/* Attack Types and Severity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Attack Type Distribution
          </h2>
          {stats?.top_attack_types && stats.top_attack_types.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.top_attack_types}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="type" stroke="#9CA3AF" fontSize={12} angle={-45} textAnchor="end" height={70} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" fill={COLORS.primary} radius={[8, 8, 0, 0]}>
                  {stats.top_attack_types.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No attack data available</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Severity Distribution
          </h2>
          {stats?.severity_distribution && stats.severity_distribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.severity_distribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {stats.severity_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={
                      entry.name === 'Critical' ? COLORS.danger :
                      entry.name === 'High' ? COLORS.warning :
                      entry.name === 'Medium' ? COLORS.primary :
                      COLORS.success
                    } />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No severity data available</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );

  const renderTimeAnalysisTab = () => (
    <>
      {/* Hourly Pattern */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          24-Hour Attack Pattern
        </h2>
        {stats?.hourly_stats && stats.hourly_stats.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.hourly_stats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis dataKey="hour" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="total" stroke={COLORS.primary} strokeWidth={2} dot={false} name="Total" />
              <Line type="monotone" dataKey="attacks" stroke={COLORS.warning} strokeWidth={2} dot={false} name="Attacks" />
              <Line type="monotone" dataKey="blocked" stroke={COLORS.danger} strokeWidth={2} dot={false} name="Blocked" />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hourly data available</p>
            </div>
          </div>
        )}
      </div>

      {/* Peak Hours Heatmap */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Peak Attack Hours
        </h2>
        {stats?.hourly_stats && stats.hourly_stats.length > 0 ? (
          <>
            <div className="grid grid-cols-24 gap-1">
              {stats.hourly_stats.map((hour, index) => {
                const intensity = hour.attacks / Math.max(...(stats.hourly_stats?.map(h => h.attacks) || [1]));
                return (
                  <div
                    key={index}
                    className="aspect-square rounded-sm transition-all hover:scale-110"
                    style={{
                      backgroundColor: `rgba(239, 68, 68, ${intensity})`,
                      border: intensity > 0.7 ? '2px solid #DC2626' : 'none'
                    }}
                    title={`${hour.hour}: ${hour.attacks} attacks`}
                  />
                );
              })}
            </div>
            <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:00</span>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hourly attack data available</p>
            </div>
          </div>
        )}
      </div>
    </>
  );

  const renderGeographicTab = () => (
    <>
      {/* Country Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Geographic Distribution
        </h2>
        {stats?.country_stats && stats.country_stats.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={stats.country_stats} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis type="number" stroke="#9CA3AF" fontSize={12} />
              <YAxis dataKey="country" type="category" stroke="#9CA3AF" fontSize={12} width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="requests" fill={COLORS.primary} name="Total Requests" />
              <Bar dataKey="attacks" fill={COLORS.danger} name="Attack Attempts" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-96 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <Globe className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No geographic data available</p>
            </div>
          </div>
        )}
      </div>

      {/* Top Countries Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Top Attack Origins
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Country
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Requests
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Attack Attempts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Attack Rate
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {stats?.country_stats && stats.country_stats.length > 0 ? (
                stats.country_stats.map((country, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center">
                        <Globe className="w-4 h-4 mr-2 text-gray-400" />
                        {country.country}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {country.requests.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <span className="text-red-600 dark:text-red-400">
                        {country.attacks.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <span className="mr-2">
                          {((country.attacks / country.requests) * 100).toFixed(1)}%
                        </span>
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-red-500 h-2 rounded-full"
                            style={{ width: `${(country.attacks / country.requests) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    <div className="flex flex-col items-center">
                      <Globe className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm">No geographic data available</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  const renderAdvancedTab = () => (
    <>
      {/* HTTP Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            HTTP Method Distribution
          </h2>
          {stats?.method_stats && stats.method_stats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={stats.method_stats}>
                <PolarGrid stroke="#374151" strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="method" stroke="#9CA3AF" fontSize={12} />
                <PolarRadiusAxis angle={90} domain={[0, 'auto']} stroke="#9CA3AF" fontSize={10} />
                <Radar name="Requests" dataKey="count" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.6} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <Server className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No method data available</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Response Code Analysis
          </h2>
          {stats?.response_codes && stats.response_codes.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.response_codes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                <XAxis dataKey="code" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {stats.response_codes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={
                      entry.code.startsWith('2') ? COLORS.success :
                      entry.code.startsWith('3') ? COLORS.primary :
                      entry.code.startsWith('4') ? COLORS.warning :
                      COLORS.danger
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No response code data available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Source IPs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Top Source IPs
        </h2>
        {stats?.top_source_ips && stats.top_source_ips.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {stats.top_source_ips.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3`} style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                  <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                    {item.ip}
                  </span>
                </div>
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900 dark:text-white mr-2">
                    {item.count.toLocaleString()}
                  </span>
                  <span className="text-xs text-gray-500">requests</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No IP data available</p>
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Security Analytics Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Comprehensive security insights and threat analysis
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Time Range:
            </span>
          </div>
          <div className="flex space-x-2">
            {['24h', '7d', '30d'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {range === '24h' ? 'Last 24 Hours' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex -mb-px">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'time', label: 'Time Analysis', icon: Clock },
              { id: 'geographic', label: 'Geographic', icon: Globe },
              { id: 'advanced', label: 'Advanced', icon: Database }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 dark:text-blue-400 border-blue-600 dark:border-blue-400'
                    : 'text-gray-500 dark:text-gray-400 border-transparent hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="animate-fadeIn">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'time' && renderTimeAnalysisTab()}
          {activeTab === 'geographic' && renderGeographicTab()}
          {activeTab === 'advanced' && renderAdvancedTab()}
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;