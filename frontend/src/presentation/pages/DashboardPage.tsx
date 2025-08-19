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
  const [wsConnected, setWsConnected] = useState(false);
  const [realtimeEvents, setRealtimeEvents] = useState<any[]>([]);

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

  // WebSocket connection for real-time updates
  useEffect(() => {
    let ws: WebSocket | null = null;
    
    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws/security-events`;
      
      try {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('WebSocket connected');
          setWsConnected(true);
        };
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            // Add to realtime events (keep last 10)
            setRealtimeEvents(prev => [data, ...prev].slice(0, 10));
            // Reload dashboard data if it's a high severity event
            if (data.severity === 'HIGH' || data.severity === 'CRITICAL') {
              loadDashboardData();
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setWsConnected(false);
        };
        
        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setWsConnected(false);
          // Reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000);
        };
      } catch (err) {
        console.error('Failed to connect WebSocket:', err);
      }
    };
    
    // Connect on mount
    const token = localStorage.getItem('auth_token');
    if (token) {
      connectWebSocket();
    }
    
    // Cleanup on unmount
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

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
    labels: data.hourlyTrends ? data.hourlyTrends.map(t => t.label) : [],
    datasets: [
      {
        label: 'Total Requests',
        data: data.hourlyTrends ? data.hourlyTrends.map(t => t.total) : [],
        borderColor: 'rgb(0, 113, 227)',
        backgroundColor: 'rgba(0, 113, 227, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Blocked Requests',
        data: data.hourlyTrends ? data.hourlyTrends.map(t => t.blocked) : [],
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  // Chart data for attack types
  const attackTypesChartData = {
    labels: data.topAttackTypes && data.topAttackTypes.length > 0 
      ? data.topAttackTypes.slice(0, 5).map(a => a.type || 'Unknown')
      : [],
    datasets: [{
      data: data.topAttackTypes && data.topAttackTypes.length > 0
        ? data.topAttackTypes.slice(0, 5).map(a => a.count || 0)
        : [],
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
          <div className="metric-value">
            {data.stats.totalRequests ? data.stats.totalRequests.toLocaleString() : '0'}
          </div>
          {data.changes?.total_requests_change !== undefined && data.changes.total_requests_change !== 0 && (
            <span className={`metric-change ${data.changes.total_requests_change >= 0 ? 'positive' : 'negative'}`}>
              {data.changes.total_requests_change >= 0 ? '↑' : '↓'} {Math.abs(data.changes.total_requests_change)}%
            </span>
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
          <div className="metric-value">
            {data.stats.blockedRequests ? data.stats.blockedRequests.toLocaleString() : '0'}
          </div>
          {data.changes?.blocked_requests_change !== undefined && data.changes.blocked_requests_change !== 0 && (
            <span className={`metric-change ${data.changes.blocked_requests_change > 20 ? 'negative' : 'warning'}`}>
              {data.changes.blocked_requests_change >= 0 ? '↑' : '↓'} {Math.abs(data.changes.blocked_requests_change)}%
            </span>
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
          <div className="metric-value">
            {data.systemHealth !== undefined ? `${data.systemHealth}%` : 'No data'}
          </div>
          {data.systemHealth !== undefined && (
            <span className={`metric-change ${data.systemHealth >= 95 ? 'positive' : data.systemHealth >= 80 ? 'warning' : 'negative'}`}>
              {data.systemHealth >= 95 ? 'Optimal' : data.systemHealth >= 80 ? 'Good' : 'Degraded'}
            </span>
          )}
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
          <div className="metric-value">
            {data.avgResponseTime !== undefined ? `${data.avgResponseTime}ms` : 'No data'}
          </div>
          {data.avgResponseTime !== undefined && (
            <span className={`metric-change ${data.avgResponseTime < 100 ? 'positive' : 'warning'}`}>
              {data.avgResponseTime < 100 ? 'Fast' : 'Moderate'}
            </span>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Traffic Trends Chart */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Traffic Trends</h3>
            <button 
              onClick={() => navigate('/analytics')}
              className="btn btn-ghost hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-1 rounded-lg transition-colors"
            >
              View Details <ArrowUpRight className="inline h-3 w-3 ml-1" />
            </button>
          </div>
          <div className="h-64">
            {trafficChartData.labels.length > 0 ? (
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
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No traffic data available</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Attack Types Distribution */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Attack Distribution</h3>
          </div>
          {data.topAttackTypes && data.topAttackTypes.length > 0 ? (
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
                {data.topAttackTypes && data.topAttackTypes.slice(0, 3).map((attack, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-2 ${
                        index === 0 ? 'bg-red-500' : 
                        index === 1 ? 'bg-amber-500' : 
                        'bg-blue-500'
                      }`} />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{attack.type || 'Unknown'}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{attack.count || 0}</span>
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
            {data.topSourceIps && data.topSourceIps.length > 0 ? data.topSourceIps.slice(0, 5).map((ip, index) => (
              <div key={index} className="flex items-center justify-between group hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-colors">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center mr-3">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{index + 1}</span>
                  </div>
                  <div>
                    <span className="text-sm font-mono text-gray-900 dark:text-gray-100">{ip.ip || 'N/A'}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">Location unknown</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{ip.count || 0}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">requests</span>
                </div>
              </div>
            )) : null}
            {(!data.topSourceIps || data.topSourceIps.length === 0) && (
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
            {data.recentEvents && data.recentEvents.length > 0 ? data.recentEvents.slice(0, 10).map((event) => (
              <div key={event.id} className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-lg transition-colors">
                <div className="flex items-center flex-1">
                  {event.blocked ? (
                    <Ban className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" />
                  ) : (
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {event.sourceIp || 'Unknown IP'}
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
            )) : null}
            {(!data.recentEvents || data.recentEvents.length === 0) && (
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">No recent events</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;