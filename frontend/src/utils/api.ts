import type { LoginRequest, RegisterRequest, AuthToken, User, PaginatedResponse, WafLogsResponse, WafStats } from '../types';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const headers: HeadersInit = {
        ...(options.headers as Record<string, string>),
      };

      if (this.token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`;
      }

      if (!(options.body instanceof FormData)) {
        (headers as Record<string, string>)['Content-Type'] = 'application/json';
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers,
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.detail || `HTTP error! status: ${response.status}`;
        throw new Error(errorMessage);
      }

      if (response.status === 204) {
        return { data: undefined as T };
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'An unknown error occurred' };
    }
  }

  async login(credentials: LoginRequest): Promise<ApiResponse<AuthToken>> {
    return this.request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) });
  }

  async register(userData: RegisterRequest): Promise<ApiResponse<User>> {
    return this.request('/auth/register', { method: 'POST', body: JSON.stringify(userData) });
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request('/auth/me');
  }


  // Vulnerable endpoints for testing
  async testXSS(payload: string): Promise<ApiResponse<any>> {
    return this.request(`/vulnerable/xss?input_data=${encodeURIComponent(payload)}`);
  }

  async testSQLInjection(payload: string): Promise<ApiResponse<any>> {
    return this.request(`/vulnerable/sqli?user_id=${encodeURIComponent(payload)}`);
  }

  async testPathTraversal(payload: string): Promise<ApiResponse<any>> {
    return this.request(`/vulnerable/path-traversal?file_path=${encodeURIComponent(payload)}`);
  }

  async testCommandInjection(payload: string): Promise<ApiResponse<any>> {
    return this.request(`/vulnerable/command-injection?command=${encodeURIComponent(payload)}`);
  }

  async testUserAgentManipulation(userAgent?: string): Promise<ApiResponse<any>> {
    const headers: HeadersInit = userAgent ? { 'User-Agent': userAgent } : {};
    return this.request('/vulnerable/user-agent', { headers });
  }

  async testHeaderManipulation(customHeaders: Record<string, string>): Promise<ApiResponse<any>> {
    return this.request('/vulnerable/header-manipulation', { headers: customHeaders });
  }

  async testFileUpload(file: File, options?: { upload_path?: string; bypass_validation?: string; custom_extension?: string; }): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.upload_path) formData.append('upload_path', options.upload_path);
    if (options?.bypass_validation) formData.append('bypass_validation', options.bypass_validation);
    if (options?.custom_extension) formData.append('custom_extension', options.custom_extension);

    // Use a separate fetch call for this specific endpoint to avoid JSON content-type
    try {
      const headers: HeadersInit = {};
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }
      const response = await fetch(`${this.baseUrl}/vulnerable/file-upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async testFileList(directory?: string): Promise<ApiResponse<any>> {
    const params = directory ? `?directory=${encodeURIComponent(directory)}` : '';
    return this.request(`/vulnerable/file-list${params}`);
  }

  async testFileDownload(filePath: string): Promise<ApiResponse<any>> {
    return this.request(`/vulnerable/file-download?file_path=${encodeURIComponent(filePath)}`);
  }

  // WAF Logs API
  async getWafLogs(params?: {
    limit?: number;
    skip?: number;
    search?: string;
    attack_type?: string;
    blocked_only?: boolean;
  }): Promise<ApiResponse<WafLogsResponse>> {
    const searchParams = new URLSearchParams();
    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
    if (params?.search) searchParams.append('search', params.search);
    if (params?.attack_type) searchParams.append('attack_type', params.attack_type);
    if (params?.blocked_only !== undefined) searchParams.append('blocked_only', params.blocked_only.toString());
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request(`/monitoring/logs${queryString}`);
  }

  async getWafStats(timeRange?: string): Promise<ApiResponse<any>> {
    // Get comprehensive stats from monitoring endpoint
    const endDate = new Date();
    let startDate = new Date();
    
    if (timeRange === '1h') {
      startDate.setHours(startDate.getHours() - 1);
    } else if (timeRange === '24h') {
      startDate.setHours(startDate.getHours() - 24);
    } else if (timeRange === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeRange === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    } else {
      startDate.setDate(startDate.getDate() - 7); // Default to 7 days
    }
    
    // Convert to local time string for KST timezone
    const toLocalISOString = (date: Date) => {
      const offset = date.getTimezoneOffset() * -1;
      const localDate = new Date(date.getTime() + offset * 60000);
      return localDate.toISOString().slice(0, -1) + '+09:00';
    };
    
    const params = new URLSearchParams({
      start_date: toLocalISOString(startDate),
      end_date: toLocalISOString(endDate)
    });
    
    // Get main stats from the monitoring endpoint with date parameters
    const statsResponse = await this.request<any>(`/monitoring/stats?${params.toString()}`);
    
    // Get additional summary from security-events endpoint
    const summaryResponse = await this.request<any>('/security-events/stats/summary?time_range=' + (timeRange || '7d'));
    
    console.log('Stats Response:', statsResponse);
    console.log('Summary Response:', summaryResponse);
    
    // Safely merge both responses without duplication
    const statsData = statsResponse.data ?? {};
    const summaryData = summaryResponse.data ?? {};
    
    // Prioritize statsData if it has summary, otherwise use summaryData
    const hasStatsSummary = statsData.summary && Object.keys(statsData.summary).length > 0;
    const primaryData = hasStatsSummary ? statsData.summary : summaryData;
    
    return {
      data: {
        // Use primary data source for basic stats
        total_requests: primaryData.total_requests ?? statsData.total_requests ?? 0,
        blocked_requests: primaryData.blocked_requests ?? statsData.blocked_requests ?? 0,
        attack_requests: primaryData.attack_requests ?? statsData.attack_requests ?? 0,
        block_rate: primaryData.block_rate ?? statsData.block_rate ?? 0,
        // Use available attack types data - ensure consistent naming
        top_attack_types: (statsData.attack_types ?? summaryData.top_attack_types ?? []).map((item: any) => ({
          type: item.type || item.name || 'Unknown',
          count: item.count || 0
        })),
        // Use available IP data - ensure consistent naming
        top_source_ips: (statsData.top_attacking_ips ?? summaryData.top_source_ips ?? []).map((item: any) => ({
          ip: item.ip || item.source_ip || 'Unknown',
          count: item.count || 0,
          country: item.country || null
        })),
        // Include real data from backend - ensure hourly_trends is passed through
        hourly_trends: statsData.hourly_trends ?? [],
        severity_distribution: statsData.severity_distribution ?? [],
        method_stats: statsData.method_stats ?? [],
        response_codes: (statsData.response_codes ?? []).map((item: any) => ({
          code: item.code || item.status_code || item.name || 'Unknown',
          count: item.count || 0
        })),
        country_stats: statsData.country_stats ?? []
      }
    };
  }

  // GeoIP API
  async getGeoipStatus(): Promise<ApiResponse<any>> {
    return this.request('/geoip/status');
  }

  async uploadGeoipDatabase(file: File): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const headers: HeadersInit = {};
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }
      const response = await fetch(`${this.baseUrl}/geoip/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return { data };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async deleteGeoipDatabase(): Promise<ApiResponse<any>> {
    return this.request('/geoip/database', { method: 'DELETE' });
  }

  // WAF Rules API
  async getWafRules(): Promise<ApiResponse<any>> {
    return this.request('/rules');
  }

  async getRuleCategory(categoryId: string): Promise<ApiResponse<any>> {
    return this.request(`/rules/category/${categoryId}`);
  }

  // CRS Rules API (Docker container rules)
  async getCrsRulesList(): Promise<ApiResponse<any>> {
    return this.request('/crs-rules/list');
  }

  async getCrsRuleContent(filename: string): Promise<ApiResponse<any>> {
    return this.request(`/crs-rules/content?filename=${encodeURIComponent(filename)}`);
  }

  async searchCrsRules(keyword: string): Promise<ApiResponse<any>> {
    return this.request(`/crs-rules/search?keyword=${encodeURIComponent(keyword)}`);
  }

  async getRuleDetails(ruleId: string): Promise<ApiResponse<any>> {
    return this.request(`/rules/rule/${ruleId}`);
  }
}

export const apiClient = new ApiClient();
