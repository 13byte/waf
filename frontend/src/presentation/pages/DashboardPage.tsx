// Dashboard page with modern Apple-inspired design
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Activity, 
  Ban, 
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Globe,
  AlertCircle,
  Clock,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';
import { GetDashboardDataUseCase, DashboardData } from '../../application/use-cases/dashboard/GetDashboardDataUseCase';
import { SecurityEventRepository } from '../../infrastructure/repositories/SecurityEventRepository';
import { SecurityAnalysisService } from '../../domain/services/SecurityAnalysisService';
import { apiClient } from '../../services/apiClient';
import { TimeRange } from '../../domain/value-objects/TimeRange';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Initialize dependencies
      const securityEventRepo = new SecurityEventRepository(apiClient);
      const securityAnalysisService = new SecurityAnalysisService();
      const getDashboardDataUseCase = new GetDashboardDataUseCase(
        securityEventRepo,
        securityAnalysisService
      );

      // Get time range
      const now = new Date();
      const startDate = new Date();
      if (timeRange === '1h') {
        startDate.setHours(now.getHours() - 1);
      } else if (timeRange === '24h') {
        startDate.setHours(now.getHours() - 24);
      } else if (timeRange === '7d') {
        startDate.setDate(now.getDate() - 7);
      } else if (timeRange === '30d') {
        startDate.setDate(now.getDate() - 30);
      }

      // Load data
      const dashboardData = await getDashboardDataUseCase.execute(
        new TimeRange(startDate, now)
      );
      
      setData(dashboardData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (change: number | undefined) => {
    if (!change) return <Minus className="h-3 w-3" />;
    if (change > 0) return <TrendingUp className="h-3 w-3" />;
    return <TrendingDown className="h-3 w-3" />;
  };

  const getTrendColor = (change: number | undefined) => {
    if (!change) return 'text-gray-500 dark:text-gray-400';
    if (change > 0) return 'text-green-600 dark:text-green-400';
    return 'text-red-600 dark:text-red-400';
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

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-500 dark:text-gray-400">Failed to load dashboard data</p>
        <button 
          onClick={() => loadDashboardData()}
          className="mt-4 btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  // Chart data for traffic trends
  const trafficChartData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: 'Total Requests',
        data: Array.from({ length: 24 }, () => Math.floor(Math.random() * 1000)),
        borderColor: 'rgb(0, 113, 227)',
        backgroundColor: 'rgba(0, 113, 227, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Blocked Requests',
        data: Array.from({ length: 24 }, () => Math.floor(Math.random() * 200)),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  // Chart data for attack types
  const attackTypesChartData = {
    labels: data.topAttackTypes.slice(0, 5).map(a => a.type),
    datasets: [{
      data: data.topAttackTypes.slice(0, 5).map(a => a.count),
      backgroundColor: [
        'rgba(239, 68, 68, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(139, 92, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)'
      ],
      borderWidth: 0
    }]
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="mb-6">
          <h1 className="section-title">WAF Security Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Real-time monitoring and threat analysis</p>
        </div>
        <div className="tabs">
          {['1h', '24h', '7d', '30d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`tab ${timeRange === range ? 'active' : ''}`}
            >
              {range === '1h' && 'Last Hour'}
              {range === '24h' && 'Last 24 Hours'}
              {range === '7d' && 'Last 7 Days'}
              {range === '30d' && 'Last 30 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="metrics-grid">
        {/* Total Requests Card */}
        <div 
          className="metric-card cursor-pointer"
          onClick={() => navigate('/analytics')}
        >
          <div className="metric-icon blue">
            📊
          </div>
          <div className="metric-label">TOTAL REQUESTS</div>
          <div className="metric-value">{data.stats.totalRequests.toLocaleString()}</div>
          {data.stats.totalRequests > 0 && (
            <span className="metric-change positive">↑ 12.5%</span>
          )}
        </div>

        {/* Blocked Requests Card */}
        <div 
          className="metric-card cursor-pointer"
          onClick={() => navigate('/security-events?blocked_only=true')}
        >
          <div className="metric-icon red">
            🛡️
          </div>
          <div className="metric-label">BLOCKED THREATS</div>
          <div className="metric-value">{data.stats.blockedRequests.toLocaleString()}</div>
          {data.stats.blockedRequests > 0 && (
            <span className="metric-change negative">↑ 34.2%</span>
          )}
        </div>

        {/* System Health Card */}
        <div 
          className="metric-card cursor-pointer"
          onClick={() => navigate('/security-events?attacks_only=true')}
        >
          <div className="metric-icon green">
            ✓
          </div>
          <div className="metric-label">SYSTEM HEALTH</div>
          <div className="metric-value">99.8%</div>
          <span className="metric-change positive">Optimal</span>
        </div>

        {/* Average Response Card */}
        <div 
          className="metric-card cursor-pointer"
          onClick={() => navigate('/analytics')}
        >
          <div className="metric-icon yellow">
            ⚡
          </div>
          <div className="metric-label">AVG RESPONSE</div>
          <div className="metric-value">42ms</div>
          <span className="metric-change positive">↓ 8ms</span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic Trends Chart */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Traffic Trends</h3>
            <button className="btn btn-ghost">
              View Details <ArrowUpRight className="inline h-3 w-3 ml-1" />
            </button>
          </div>
          <div className="h-64">
            <Line 
              data={trafficChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                      usePointStyle: true,
                      padding: 15
                    }
                  },
                  tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    cornerRadius: 8
                  }
                },
                scales: {
                  x: {
                    grid: {
                      display: false
                    }
                  },
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(0, 0, 0, 0.05)'
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Attack Types Distribution */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Attack Distribution</h3>
          </div>
          {data.topAttackTypes.length > 0 ? (
            <>
              <div className="h-48">
                <Doughnut 
                  data={attackTypesChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false
                      }
                    }
                  }}
                />
              </div>
              <div className="mt-4 space-y-2">
                {data.topAttackTypes.slice(0, 3).map((attack, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${
                        index === 0 ? 'bg-red-500' : 
                        index === 1 ? 'bg-amber-500' : 
                        'bg-blue-500'
                      }`} />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{attack.type}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{attack.count}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No attacks detected</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Source IPs */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Source IPs</h3>
            <Globe className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {data.topSourceIps.slice(0, 5).map((ip, index) => (
              <div key={index} className="flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-colors">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center mr-3">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{index + 1}</span>
                  </div>
                  <div>
                    <span className="text-sm font-mono text-gray-900 dark:text-gray-100">{ip.ip}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">{'Unknown'}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{ip.count}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">requests</span>
                </div>
              </div>
            ))}
            {data.topSourceIps.length === 0 && (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">No data available</p>
            )}
          </div>
        </div>

        {/* Recent Events */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Events</h3>
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {data.recentEvents.slice(0, 10).map((event) => (
              <div key={event.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                <div className="flex items-center flex-1">
                  {event.blocked ? (
                    <Ban className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {event.sourceIp}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(event.timestamp).toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' })}
                    </p>
                  </div>
                </div>
                {event.attackType && (
                  <span className="ml-2 px-2 py-1 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-full">
                    {event.attackType}
                  </span>
                )}
              </div>
            ))}
            {data.recentEvents.length === 0 && (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">No recent events</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;