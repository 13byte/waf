import React, { useState, useEffect } from 'react';
import { 
  Shield, Search, Filter, ChevronRight, ChevronDown, 
  AlertTriangle, Info, CheckCircle, XCircle, 
  FileText, Tag, Hash, Clock, RefreshCw,
  AlertCircle, Layers, BookOpen, ExternalLink
} from 'lucide-react';
import { apiClient } from '../../utils/api';
import { useNavigate } from 'react-router-dom';

interface RuleDetail {
  id: string;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  tags: string[];
  paranoia_level?: number;
  anomaly_score?: number;
  message?: string;
  phase?: number;
  action?: string;
}

interface RuleCategory {
  id: string;
  name: string;
  description: string;
  ruleCount: number;
  enabled: boolean;
  rules: RuleDetail[];
  lastUpdated?: string;
}

const RulesPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<RuleCategory[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRule, setSelectedRule] = useState<RuleDetail | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) {
        navigate('/login');
        return;
      }
      
      apiClient.setToken(token);
      const response = await apiClient.getWafRules();
      
      if (response.data) {
        setCategories(response.data.categories || []);
      }
    } catch (error: any) {
      console.error('Failed to fetch rules:', error);
      if (error.response?.status === 403 || error.response?.status === 401) {
        localStorage.removeItem('auth_token');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800';
      case 'HIGH':
        return 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-900/20 dark:border-orange-800';
      case 'MEDIUM':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-800';
      case 'LOW':
        return 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-900/20 dark:border-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return <XCircle className="w-4 h-4" />;
      case 'HIGH':
        return <AlertTriangle className="w-4 h-4" />;
      case 'MEDIUM':
        return <AlertCircle className="w-4 h-4" />;
      case 'LOW':
        return <Info className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  const filteredCategories = categories.filter(category => {
    if (statusFilter === 'enabled' && !category.enabled) return false;
    if (statusFilter === 'disabled' && category.enabled) return false;
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        category.name.toLowerCase().includes(searchLower) ||
        category.description.toLowerCase().includes(searchLower) ||
        category.rules.some(rule => 
          rule.id.toLowerCase().includes(searchLower) ||
          rule.description.toLowerCase().includes(searchLower) ||
          rule.tags.some(tag => tag.toLowerCase().includes(searchLower))
        )
      );
    }
    
    return true;
  });

  const getFilteredRules = (rules: RuleDetail[]) => {
    return rules.filter(rule => {
      if (severityFilter !== 'all' && rule.severity !== severityFilter) return false;
      
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        return (
          rule.id.toLowerCase().includes(searchLower) ||
          rule.description.toLowerCase().includes(searchLower) ||
          rule.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }
      
      return true;
    });
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">WAF Rules</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage and monitor Core Rule Set (CRS) configurations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchRules} className="btn btn-secondary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button className="btn btn-primary">
            <BookOpen className="w-4 h-4 mr-2" />
            Documentation
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
              <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {categories.length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Rule Categories</div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
              <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {categories.reduce((acc, cat) => acc + cat.rules.length, 0)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Total Rules</div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {categories.filter(cat => cat.enabled).length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Enabled Categories</div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {categories.reduce((acc, cat) => 
              acc + cat.rules.filter(r => r.severity === 'CRITICAL' || r.severity === 'HIGH').length, 0
            )}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">High Priority Rules</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search rules by ID, description, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 dark:focus:ring-primary/40"
              />
            </div>
          </div>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="INFO">Info</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">All Status</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      {/* Rule Categories */}
      <div className="space-y-4">
        {filteredCategories.map((category) => {
          const isExpanded = expandedCategories.has(category.id);
          const filteredRules = getFilteredRules(category.rules);
          
          return (
            <div key={category.id} className="card">
              {/* Category Header */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                onClick={() => toggleCategory(category.id)}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {category.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        category.enabled 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                        {category.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {filteredRules.length} rules
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {category.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {category.lastUpdated && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      {new Date(category.lastUpdated).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Expanded Rules */}
              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-700">
                  <div className="p-4">
                    <div className="space-y-2">
                      {filteredRules.length > 0 ? (
                        filteredRules.map((rule) => (
                          <div
                            key={rule.id}
                            className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                            onClick={() => setSelectedRule(rule)}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`p-1.5 rounded-lg border ${getSeverityColor(rule.severity)}`}>
                                {getSeverityIcon(rule.severity)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                                    {rule.id}
                                  </span>
                                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getSeverityColor(rule.severity)}`}>
                                    {rule.severity}
                                  </span>
                                  {rule.paranoia_level && (
                                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                                      PL{rule.paranoia_level}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                  {rule.description}
                                </p>
                                <div className="flex items-center gap-2 flex-wrap">
                                  {rule.tags.map((tag, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                                    >
                                      <Tag className="w-3 h-3" />
                                      {tag}
                                    </span>
                                  ))}
                                  {rule.anomaly_score && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400">
                                      <Hash className="w-3 h-3" />
                                      Score: {rule.anomaly_score}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <ExternalLink className="w-4 h-4 text-gray-400 hover:text-primary transition-colors" />
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          No rules match the current filters
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Rule Detail Modal */}
      {selectedRule && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Rule Details
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                    {selectedRule.id}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRule(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Description
                  </h3>
                  <p className="text-gray-900 dark:text-white">
                    {selectedRule.description}
                  </p>
                </div>

                {selectedRule.message && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Message
                    </h3>
                    <p className="text-gray-900 dark:text-white font-mono text-sm bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                      {selectedRule.message}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Severity
                    </h3>
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg border ${getSeverityColor(selectedRule.severity)}`}>
                      {getSeverityIcon(selectedRule.severity)}
                      {selectedRule.severity}
                    </span>
                  </div>

                  {selectedRule.paranoia_level && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                        Paranoia Level
                      </h3>
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                        Level {selectedRule.paranoia_level}
                      </span>
                    </div>
                  )}

                  {selectedRule.anomaly_score && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                        Anomaly Score
                      </h3>
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                        {selectedRule.anomaly_score} points
                      </span>
                    </div>
                  )}

                  {selectedRule.phase && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                        Phase
                      </h3>
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                        Phase {selectedRule.phase}
                      </span>
                    </div>
                  )}
                </div>

                {selectedRule.action && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Action
                    </h3>
                    <p className="text-gray-900 dark:text-white font-mono text-sm">
                      {selectedRule.action}
                    </p>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                    Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedRule.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedRule(null)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
                <button className="btn btn-primary">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Documentation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RulesPage;