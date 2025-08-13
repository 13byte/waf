// Analytics and reports page
import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar, Download, Filter } from 'lucide-react';

const AnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/dashboard/stats?time_range=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
          Security Analytics
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Analyze attack patterns and security trends
        </p>
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
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {range === '24h' ? 'Last 24 Hours' : range === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Requests
                </span>
                <BarChart3 className="w-5 h-5 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.stats?.total_requests || 0}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Blocked Attacks
                </span>
                <TrendingUp className="w-5 h-5 text-red-400" />
              </div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {stats?.stats?.blocked_requests || 0}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Block Rate
                </span>
                <Filter className="w-5 h-5 text-yellow-400" />
              </div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats?.stats?.block_rate?.toFixed(1) || 0}%
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Risk Score
                </span>
                <TrendingUp className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats?.risk_score?.toFixed(1) || 0}
              </div>
            </div>
          </div>

          {/* Attack Types Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Top Attack Types
              </h2>
              <div className="space-y-3">
                {stats?.stats?.top_attack_types?.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {item.type || 'Unknown'}
                    </span>
                    <div className="flex items-center">
                      <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
                        <div 
                          className="bg-red-600 h-2 rounded-full"
                          style={{ width: `${(item.count / stats.stats.total_requests * 100).toFixed(0)}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {item.count}
                      </span>
                    </div>
                  </div>
                )) || <p className="text-gray-500">No data available</p>}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Top Source IPs
              </h2>
              <div className="space-y-3">
                {stats?.stats?.top_source_ips?.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                      {item.ip}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {item.count} requests
                    </span>
                  </div>
                )) || <p className="text-gray-500">No data available</p>}
              </div>
            </div>
          </div>

          {/* Export Button */}
          <div className="mt-6 flex justify-end">
            <button className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;