import type { LoginRequest, RegisterRequest, AuthToken, User, Post, Category, PostFormData, CommentCreateRequest, Comment, PaginatedResponse, WafLogsResponse, WafStats } from '../types';

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

  // Posts API
  async getPosts(params?: { skip?: number; limit?: number; category_id?: number; search?: string; }): Promise<ApiResponse<Post[]>> {
    const searchParams = new URLSearchParams();
    if (params?.skip !== undefined) searchParams.append('skip', params.skip.toString());
    if (params?.limit !== undefined) searchParams.append('limit', params.limit.toString());
    if (params?.category_id) searchParams.append('category_id', params.category_id.toString());
    if (params?.search) searchParams.append('search', params.search);
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return this.request(`/posts${queryString}`);
  }

  async getPost(id: number): Promise<ApiResponse<Post>> {
    return this.request(`/posts/${id}`);
  }

  async createPost(postData: PostFormData): Promise<ApiResponse<Post>> {
    const formData = new FormData();
    formData.append('title', postData.title);
    formData.append('content', postData.content);
    formData.append('category_id', postData.category_id.toString());
    if (postData.image) formData.append('image', postData.image);
    return this.request('/posts/', { method: 'POST', body: formData });
  }

  async updatePost(id: number, postData: PostFormData): Promise<ApiResponse<Post>> {
    const formData = new FormData();
    formData.append('title', postData.title);
    formData.append('content', postData.content);
    formData.append('category_id', postData.category_id.toString());
    if (postData.image) formData.append('image', postData.image);
    return this.request(`/posts/${id}`, { method: 'PUT', body: formData });
  }

  async deletePost(id: number): Promise<ApiResponse<void>> {
    return this.request(`/posts/${id}`, { method: 'DELETE' });
  }

  // Categories API
  async getCategories(): Promise<ApiResponse<Category[]>> {
    return this.request('/categories/');
  }

  // Comments API
  async getComments(postId: number): Promise<ApiResponse<Comment[]>> {
    return this.request(`/posts/${postId}/comments`);
  }

  async createComment(commentData: CommentCreateRequest): Promise<ApiResponse<Comment>> {
    return this.request('/comments', { method: 'POST', body: JSON.stringify(commentData) });
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
    
    if (timeRange === '24h') {
      startDate.setHours(startDate.getHours() - 24);
    } else if (timeRange === '7d') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeRange === '30d') {
      startDate.setDate(startDate.getDate() - 30);
    } else {
      startDate.setDate(startDate.getDate() - 7); // Default to 7 days
    }
    
    const params = new URLSearchParams({
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString()
    });
    
    // Get main stats
    const statsResponse = await this.request<any>(`/monitoring/stats?${params.toString()}`);
    
    // Get additional summary for backward compatibility
    const summaryResponse = await this.request<any>('/security-events/stats/summary?time_range=' + (timeRange || '7d'));
    
    // Safely merge both responses
    const statsData = statsResponse.data || {};
    const summaryData = summaryResponse.data || {};
    
    return {
      data: {
        // Merge summary data
        ...(statsData.summary || {}),
        ...(summaryData || {}),
        // Use available attack types data
        top_attack_types: statsData.attack_types || summaryData.top_attack_types || [],
        // Use available IP data
        top_source_ips: statsData.top_attacking_ips || summaryData.top_source_ips || [],
        // Include real data from backend
        hourly_trends: statsData.hourly_trends || null,
        severity_distribution: statsData.severity_distribution || null,
        method_stats: statsData.method_stats || [],
        response_codes: statsData.response_codes || [],
        country_stats: statsData.country_stats || []
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
}

export const apiClient = new ApiClient();
