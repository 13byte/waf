import { cacheService } from './CacheService';

interface RequestOptions extends RequestInit {
  useCache?: boolean;
  cacheTTL?: number;
}

/**
 * Optimized API service with caching and retry logic
 */
class ApiService {
  private baseURL: string = '/api';
  private maxRetries: number = 3;
  private retryDelay: number = 1000;

  /**
   * Get auth token
   */
  private getAuthToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /**
   * Build headers
   */
  private buildHeaders(headers?: HeadersInit): Headers {
    const defaultHeaders = new Headers(headers);
    
    const token = this.getAuthToken();
    if (token) {
      defaultHeaders.set('Authorization', `Bearer ${token}`);
    }
    
    if (!defaultHeaders.has('Content-Type')) {
      defaultHeaders.set('Content-Type', 'application/json');
    }
    
    return defaultHeaders;
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryRequest<T>(
    fn: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.retryRequest(fn, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Make request with caching
   */
  private async request<T>(
    url: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { useCache = false, cacheTTL, ...fetchOptions } = options;
    const cacheKey = `${fetchOptions.method || 'GET'}:${url}`;

    // Check cache for GET requests
    if (useCache && (!fetchOptions.method || fetchOptions.method === 'GET')) {
      const cached = cacheService.get<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Build full URL
    const fullURL = url.startsWith('http') ? url : `${this.baseURL}${url}`;

    // Make request with retry
    const response = await this.retryRequest(async () => {
      const res = await fetch(fullURL, {
        ...fetchOptions,
        headers: this.buildHeaders(fetchOptions.headers),
      });

      if (!res.ok) {
        if (res.status === 401) {
          // Handle unauthorized
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      return res;
    });

    const data = await response.json();

    // Cache successful GET requests
    if (useCache && (!fetchOptions.method || fetchOptions.method === 'GET')) {
      cacheService.set(cacheKey, data, cacheTTL);
    }

    return data;
  }

  /**
   * GET request
   */
  async get<T>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T>(url: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /**
   * PUT request
   */
  async put<T>(url: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * Upload file
   */
  async upload<T>(url: string, formData: FormData, options?: RequestOptions): Promise<T> {
    const headers = new Headers(options?.headers);
    headers.delete('Content-Type'); // Let browser set boundary

    return this.request<T>(url, {
      ...options,
      method: 'POST',
      headers,
      body: formData,
    });
  }
}

// Export singleton instance
export const apiService = new ApiService();