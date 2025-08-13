// Dashboard page
import React, { useEffect, useState } from 'react';
import { 
  Shield, 
  Activity, 
  Ban, 
  CheckCircle,
  TrendingUp,
  Globe,
  AlertCircle
} from 'lucide-react';
import { StatCard } from '../components/cards/StatCard';
import { ThreatLevelIndicator } from '../components/charts/ThreatLevelIndicator';
import { GetDashboardDataUseCase, DashboardData } from '../../application/use-cases/dashboard/GetDashboardDataUseCase';
import { SecurityEventRepository } from '../../infrastructure/repositories/SecurityEventRepository';
import { SecurityAnalysisService } from '../../domain/services/SecurityAnalysisService';
import { ApiClient } from '../../infrastructure/api/ApiClient';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Initialize dependencies
      const apiClient = new ApiClient();
      const securityEventRepo = new SecurityEventRepository(apiClient);
      const securityAnalysisService = new SecurityAnalysisService();
      const getDashboardDataUseCase = new GetDashboardDataUseCase(
        securityEventRepo,
        securityAnalysisService
      );

      // Get time range
      const now = new Date();
      const startDate = new Date();
      if (timeRange === '24h') {
        startDate.setHours(now.getHours() - 24);
      } else if (timeRange === '7d') {
        startDate.setDate(now.getDate() - 7);
      } else if (timeRange === '30d') {
        startDate.setDate(now.getDate() - 30);
      }

      // Load data
      const dashboardData = await getDashboardDataUseCase.execute(
        { startDate, endDate: now }
      );
      
      setData(dashboardData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Failed to load dashboard data</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Real-time WAF monitoring and analysis</p>
        </div>
        
        {/* Time range selector */}
        <div className="flex space-x-2">
          {['24h', '7d', '30d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {range === '24h' ? 'Last 24 Hours' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Requests"
          value={data.stats.totalRequests.toLocaleString()}
          icon={<Globe />}
          color="blue"
        />
        <StatCard
          title="Blocked Requests"
          value={data.stats.blockedRequests.toLocaleString()}
          icon={<Ban />}
          color="red"
          change={data.stats.blockRate}
        />
        <StatCard
          title="Attack Attempts"
          value={data.stats.attackRequests.toLocaleString()}
          icon={<AlertCircle />}
          color="yellow"
        />
        <StatCard
          title="Allowed Requests"
          value={(data.stats.totalRequests - data.stats.blockedRequests).toLocaleString()}
          icon={<CheckCircle />}
          color="green"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Threat Level */}
        <div className="lg:col-span-1">
          <ThreatLevelIndicator
            level={data.threatLevel.level as any}
            score={data.threatLevel.score}
            reasons={data.threatLevel.reasons}
          />
        </div>

        {/* Top Attack Types */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Attack Types</h3>
            <div className="space-y-3">
              {data.topAttackTypes.slice(0, 5).map((attack, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-3 ${
                      index === 0 ? 'bg-red-500' : 
                      index === 1 ? 'bg-orange-500' : 
                      'bg-yellow-500'
                    }`} />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {attack.type}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {attack.count}
                  </span>
                </div>
              ))}
              {data.topAttackTypes.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">No attacks detected</p>
              )}
            </div>
          </div>
        </div>

        {/* Top Source IPs */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Source IPs</h3>
            <div className="space-y-3">
              {data.topSourceIps.slice(0, 5).map((ip, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Shield className="w-4 h-4 text-gray-400 mr-3" />
                    <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                      {ip.ip}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {ip.count}
                  </span>
                </div>
              ))}
              {data.topSourceIps.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">No data available</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Security Events</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Source IP
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {data.recentEvents.map((event) => (
                <tr key={event.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-300">
                    {event.sourceIp}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {event.attackType ? (
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 rounded-full">
                        {event.attackType}
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 rounded-full">
                        Normal
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {event.blocked ? (
                      <Ban className="w-5 h-5 text-red-500" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </td>
                </tr>
              ))}
              {data.recentEvents.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No recent events
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};