import React, { useState, useEffect } from 'react';
import { 
  Shield, Search, Filter, ChevronRight, ChevronDown, 
  AlertTriangle, Info, CheckCircle, XCircle, 
  FileText, Tag, Hash, Clock, RefreshCw,
  AlertCircle, Layers, BookOpen, ExternalLink,
  FolderTree, Terminal, FileCode
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
  const [activeTab, setActiveTab] = useState('custom');
  const [crsRules, setCrsRules] = useState<any[]>([]);
  const [crsLoading, setCrsLoading] = useState(false);
  const [selectedCrsFile, setSelectedCrsFile] = useState<any>(null);
  const [crsSearchTerm, setCrsSearchTerm] = useState('');
  const [crsSearchResults, setCrsSearchResults] = useState<any>(null);
  const [showRawData, setShowRawData] = useState(false);
  const [parsedRules, setParsedRules] = useState<any[]>([]);
  const [totalRuleCount, setTotalRuleCount] = useState(0);
  const [criticalRuleCount, setCriticalRuleCount] = useState(0);

  useEffect(() => {
    if (activeTab === 'custom') {
      fetchRules();
    } else if (activeTab === 'crs') {
      fetchCrsRules();
    }
  }, [activeTab]);

  const fetchCrsRules = async () => {
    try {
      setCrsLoading(true);
      const token = localStorage.getItem('auth_token');
      if (!token) {
        navigate('/login');
        return;
      }
      
      apiClient.setToken(token);
      const response = await apiClient.getCrsRulesList();
      
      if (response.data) {
        setCrsRules(response.data.rules || []);
        // Use actual counts from backend
        if (response.data.total_rules !== undefined) {
          setTotalRuleCount(response.data.total_rules);
        }
        if (response.data.critical_rules !== undefined) {
          setCriticalRuleCount(response.data.critical_rules);
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch CRS rules:', error);
    } finally {
      setCrsLoading(false);
    }
  };

  const searchCrsRules = async () => {
    if (!crsSearchTerm || crsSearchTerm.length < 3) return;
    
    try {
      setCrsLoading(true);
      const token = localStorage.getItem('auth_token');
      apiClient.setToken(token);
      const response = await apiClient.searchCrsRules(crsSearchTerm);
      
      if (response.data) {
        setCrsSearchResults(response.data);
      }
    } catch (error) {
      console.error('Failed to search CRS rules:', error);
    } finally {
      setCrsLoading(false);
    }
  };

  const viewCrsRuleContent = async (filename: string) => {
    try {
      setCrsLoading(true);
      const token = localStorage.getItem('auth_token');
      apiClient.setToken(token);
      const response = await apiClient.getCrsRuleContent(filename);
      
      if (response.data) {
        setSelectedCrsFile(response.data);
        // Parse rules from content
        parseRulesFromContent(response.data.content);
      }
    } catch (error) {
      console.error('Failed to fetch CRS rule content:', error);
    } finally {
      setCrsLoading(false);
    }
  };

  const parseRulesFromContent = (content: string) => {
    const rules: any[] = [];
    const lines = content.split('\n');
    let currentRule: any = null;
    
    for (const line of lines) {
      // Match SecRule patterns
      if (line.trim().startsWith('SecRule')) {
        if (currentRule) {
          rules.push(currentRule);
        }
        
        // Extract rule components
        const idMatch = line.match(/id:(\d+)/);
        const msgMatch = line.match(/msg:['"]([^'"]+)['"]/);
        const severityMatch = line.match(/severity:['"]?([^'"\s,]+)['"]?/);
        const tagMatch = line.match(/tag:['"]([^'"]+)['"]/g);
        const phaseMatch = line.match(/phase:(\d+)/);
        const scoreMatch = line.match(/setvar:tx\.anomaly_score_pl\d+=(\d+)/);
        
        currentRule = {
          id: idMatch ? idMatch[1] : 'N/A',
          message: msgMatch ? msgMatch[1] : line.substring(0, 100),
          severity: severityMatch ? severityMatch[1] : 'UNKNOWN',
          phase: phaseMatch ? phaseMatch[1] : 'N/A',
          tags: tagMatch ? tagMatch.map(t => t.match(/tag:['"]([^'"]+)['"]/)?.[1] || '') : [],
          anomalyScore: scoreMatch ? scoreMatch[1] : null,
          rawRule: line
        };
        
        // Extract the rule pattern
        const patternMatch = line.match(/SecRule\s+([^\s]+)\s+"([^"]+)"/);
        if (patternMatch) {
          currentRule.variable = patternMatch[1];
          currentRule.pattern = patternMatch[2];
        }
      } else if (currentRule && line.trim().startsWith('\\')) {
        // Continuation of previous rule
        currentRule.rawRule += '\n' + line;
        
        // Check for additional tags or parameters in continuation
        const msgMatch = line.match(/msg:['"]([^'"]+)['"]/);
        const tagMatch = line.match(/tag:['"]([^'"]+)['"]/g);
        
        if (msgMatch && !currentRule.message) {
          currentRule.message = msgMatch[1];
        }
        if (tagMatch) {
          const newTags = tagMatch.map(t => t.match(/tag:['"]([^'"]+)['"]/)?.[1] || '');
          currentRule.tags = [...currentRule.tags, ...newTags];
        }
      }
    }
    
    if (currentRule) {
      rules.push(currentRule);
    }
    
    setParsedRules(rules);
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'ERROR': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'WARNING': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'NOTICE': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

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
            Manage custom rules and monitor Core Rule Set (CRS) configurations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchRules} className="btn btn-secondary">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <a 
            href="https://coreruleset.org/docs/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Documentation
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-6">
        <button
          onClick={() => setActiveTab('custom')}
          className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
            activeTab === 'custom'
              ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <Shield className="w-4 h-4" />
            Custom Rules
          </div>
        </button>
        <button
          onClick={() => setActiveTab('crs')}
          className={`flex-1 px-4 py-2 rounded-md font-medium transition-all ${
            activeTab === 'crs'
              ? 'bg-white dark:bg-gray-700 text-primary shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            <FolderTree className="w-4 h-4" />
            CRS Rules (Container)
          </div>
        </button>
      </div>

      {/* Custom Rules Tab */}
      {activeTab === 'custom' && (
        <>
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

        </>
      )}

      {/* CRS Rules Tab */}
      {activeTab === 'crs' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {crsRules.length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Rule Files</div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg">
                  <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {totalRuleCount || 0}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Total Rules</div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {criticalRuleCount || 0}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Critical Rules</div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg">
                  <FolderTree className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                OWASP CRS
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Rule Source</div>
            </div>
          </div>

          {/* CRS Search Bar */}
          <div className="card p-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search in CRS rules (min 3 characters)..."
                    value={crsSearchTerm}
                    onChange={(e) => setCrsSearchTerm(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && searchCrsRules()}
                    className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <button
                onClick={searchCrsRules}
                disabled={crsSearchTerm.length < 3}
                className="btn btn-primary"
              >
                <Search className="w-4 h-4 mr-2" />
                Search
              </button>
              <button onClick={fetchCrsRules} className="btn btn-secondary">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>

          {/* CRS Search Results */}
          {crsSearchResults && (
            <div className="card">
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4">
                  Search Results ({crsSearchResults.total_matches} matches)
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {crsSearchResults.matches?.map((match: any, idx: number) => (
                    <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                      <div className="flex items-start gap-2">
                        <FileCode className="w-4 h-4 text-gray-400 mt-1" />
                        <div className="flex-1">
                          <div className="font-mono text-sm text-primary mb-1">
                            {match.file}
                          </div>
                          <div className="font-mono text-xs text-gray-600 dark:text-gray-300">
                            {match.line}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CRS Rules List */}
          <div className="card">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Core Rule Set Configuration Files
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {crsRules.length} files loaded
                </span>
              </div>
              {crsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {crsRules.map((file, idx) => {
                    const categoryMatch = file.match(/REQUEST-(\d+)-([A-Z-]+)\.conf/);
                    const categoryNumber = categoryMatch ? categoryMatch[1] : null;
                    const categoryName = categoryMatch ? categoryMatch[2].replace(/-/g, ' ') : file;
                    
                    let categoryIcon = FileText;
                    let categoryColor = 'text-gray-500';
                    
                    if (file.includes('SQLI')) {
                      categoryIcon = Shield;
                      categoryColor = 'text-red-500';
                    } else if (file.includes('XSS')) {
                      categoryIcon = AlertTriangle;
                      categoryColor = 'text-orange-500';
                    } else if (file.includes('SCANNER')) {
                      categoryIcon = Search;
                      categoryColor = 'text-blue-500';
                    } else if (file.includes('PROTOCOL')) {
                      categoryIcon = Layers;
                      categoryColor = 'text-green-500';
                    } else if (file.includes('APPLICATION')) {
                      categoryIcon = Terminal;
                      categoryColor = 'text-purple-500';
                    }
                    
                    const IconComponent = categoryIcon;
                    
                    return (
                      <button
                        key={idx}
                        onClick={() => viewCrsRuleContent(file)}
                        className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all hover:shadow-md text-left group"
                      >
                        <div className={`p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm ${categoryColor}`}>
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                            {categoryName}
                          </div>
                          <div className="font-mono text-xs text-gray-500 dark:text-gray-400">
                            {file}
                          </div>
                        </div>
                        {categoryNumber && (
                          <span className="px-2 py-1 text-xs font-mono bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded">
                            {categoryNumber}
                          </span>
                        )}
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary transition-colors" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CRS File Content Modal */}
      {selectedCrsFile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    CRS Rule Details
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                    {selectedCrsFile.filename}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      Size: {(selectedCrsFile.size / 1024).toFixed(2)} KB
                    </span>
                    <span className="flex items-center gap-1">
                      <Shield className="w-4 h-4" />
                      Total Rules: {selectedCrsFile.rule_count}
                    </span>
                    <span className="flex items-center gap-1">
                      <Hash className="w-4 h-4" />
                      Parsed: {parsedRules.length}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedCrsFile(null);
                    setParsedRules([]);
                    setShowRawData(false);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <XCircle className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowRawData(false)}
                className={`px-6 py-3 font-medium transition-colors ${
                  !showRawData
                    ? 'text-primary border-b-2 border-primary bg-gray-50 dark:bg-gray-700/50'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  Parsed Rules
                </div>
              </button>
              <button
                onClick={() => setShowRawData(true)}
                className={`px-6 py-3 font-medium transition-colors ${
                  showRawData
                    ? 'text-primary border-b-2 border-primary bg-gray-50 dark:bg-gray-700/50'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4" />
                  Raw Data
                </div>
              </button>
            </div>
            
            <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 250px)' }}>
              {!showRawData ? (
                /* Parsed Rules View */
                <div className="p-6">
                  {parsedRules.length > 0 ? (
                    <div className="space-y-3">
                      {parsedRules.map((rule, idx) => (
                        <div
                          key={idx}
                          className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-sm font-medium text-primary">
                                Rule {rule.id}
                              </span>
                              <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityBadgeColor(rule.severity)}`}>
                                {rule.severity}
                              </span>
                              {rule.phase && (
                                <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                  Phase {rule.phase}
                                </span>
                              )}
                              {rule.anomalyScore && (
                                <span className="px-2 py-1 text-xs font-medium rounded bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                                  Score: {rule.anomalyScore}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                            {rule.message}
                          </p>
                          
                          {rule.variable && (
                            <div className="mb-3">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Variable: </span>
                              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                {rule.variable}
                              </code>
                            </div>
                          )}
                          
                          {rule.pattern && (
                            <div className="mb-3">
                              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Pattern: </span>
                              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded break-all">
                                {rule.pattern.substring(0, 200)}{rule.pattern.length > 200 ? '...' : ''}
                              </code>
                            </div>
                          )}
                          
                          {rule.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {rule.tags.map((tag: string, tagIdx: number) => (
                                <span
                                  key={tagIdx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"
                                >
                                  <Tag className="w-3 h-3" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No rules parsed from this file</p>
                    </div>
                  )}
                </div>
              ) : (
                /* Raw Data View */
                <div className="p-6">
                  <pre className="font-mono text-xs bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-x-auto">
                    <code className="text-gray-800 dark:text-gray-200">
                      {selectedCrsFile.content}
                    </code>
                  </pre>
                </div>
              )}
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {!showRawData && parsedRules.length > 0 && (
                  <span>Showing {parsedRules.length} parsed rules</span>
                )}
              </div>
              <button
                onClick={() => {
                  setSelectedCrsFile(null);
                  setParsedRules([]);
                  setShowRawData(false);
                }}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
                <a 
                  href={`https://coreruleset.org/docs/rules/${selectedRule?.file?.replace('.conf', '')?.toLowerCase()}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Documentation
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RulesPage;