// Security event repository implementation
import { ISecurityEventRepository, SecurityEventFilter, PaginationParams, SecurityEventStats } from '../../domain/repositories/ISecurityEventRepository';
import { SecurityEvent, SecurityEventEntity, HttpMethod, AttackType, SeverityLevel } from '../../domain/entities/SecurityEvent';
import { TimeRange } from '../../domain/value-objects/TimeRange';
import { ApiClient } from '../api/ApiClient';

interface ApiSecurityEvent {
  id: string;
  timestamp: string;
  source_ip: string;
  source_port?: number;
  destination_ip?: string;
  destination_port?: number;
  target_website?: string;
  uri: string;
  method: string;
  status_code: number;
  attack_type?: string;
  severity: string;
  is_attack: boolean;
  is_blocked: boolean;
  anomaly_score: number;
  risk_score: number;
  rules_matched?: string[];
  rule_files?: string[];
  request_headers?: any;
  response_headers?: any;
  user_agent?: string;
}

export class SecurityEventRepository implements ISecurityEventRepository {
  constructor(private apiClient: ApiClient) {}

  private mapApiToEntity(apiEvent: ApiSecurityEvent): SecurityEvent {
    // Map severity string to level
    let severity: SeverityLevel;
    const severityStr = apiEvent.severity?.toLowerCase() || 'low';
    switch (severityStr) {
      case 'critical':
        severity = SeverityLevel.CRITICAL;
        break;
      case 'high':
        severity = SeverityLevel.HIGH;
        break;
      case 'medium':
        severity = SeverityLevel.MEDIUM;
        break;
      default:
        severity = SeverityLevel.LOW;
    }

    return new SecurityEventEntity(
      apiEvent.id,
      new Date(apiEvent.timestamp),
      apiEvent.source_ip,
      apiEvent.target_website || apiEvent.uri,
      apiEvent.method as HttpMethod,
      apiEvent.status_code,
      severity,
      apiEvent.is_blocked,
      apiEvent.rules_matched || [],
      apiEvent.anomaly_score,
      apiEvent.attack_type as AttackType | undefined
    );
  }

  async getAll(filter?: SecurityEventFilter, pagination?: PaginationParams): Promise<{ events: SecurityEvent[]; total: number }> {
    const params: Record<string, any> = {};
    
    if (pagination) {
      params.page = pagination.page;
      params.page_size = pagination.limit;
    }
    
    if (filter) {
      if (filter.sourceIp) params.source_ip = filter.sourceIp;
      if (filter.attackType) params.attack_type = filter.attackType;
      if (filter.blocked !== undefined) params.blocked_only = filter.blocked;
      if (filter.search) params.search = filter.search;
      if (filter.timeRange) {
        // Convert to KST and format without milliseconds for FastAPI compatibility
        const toKSTString = (date: Date) => {
          // Add 9 hours for KST (UTC+9)
          const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
          return kstDate.toISOString().split('.')[0] + '+09:00';
        };
        params.start_date = toKSTString(filter.timeRange.startDate);
        params.end_date = toKSTString(filter.timeRange.endDate);
      }
    }
    
    const response = await this.apiClient.get<{
      events: ApiSecurityEvent[];
      pagination: {
        page: number;
        page_size: number;
        total: number;
        total_pages: number;
      };
    }>('/security-events', params);
    
    return {
      events: response.events.map(event => this.mapApiToEntity(event)),
      total: response.pagination.total
    };
  }

  async getById(id: string): Promise<SecurityEvent | null> {
    try {
      const response = await this.apiClient.get<ApiSecurityEvent>(`/security-events/${id}`);
      return this.mapApiToEntity(response);
    } catch {
      return null;
    }
  }

  async getStats(timeRange?: TimeRange): Promise<SecurityEventStats> {
    const params: Record<string, any> = {};
    
    if (timeRange) {
      // Calculate time range string for dashboard API
      const now = new Date();
      const hours = Math.abs(now.getTime() - timeRange.startDate.getTime()) / 36e5;
      if (hours <= 1) {
        params.time_range = '1h';
      } else if (hours <= 24) {
        params.time_range = '24h';
      } else if (hours <= 24 * 7) {
        params.time_range = '7d';
      } else {
        params.time_range = '30d';
      }
    } else {
      params.time_range = '24h';
    }
    
    try {
      const response = await this.apiClient.get<{
        stats: {
          total_requests: number;
          blocked_requests: number;
          attack_requests: number;
          block_rate: number;
          top_attack_types: Array<{ type: string; count: number }>;
          top_source_ips: Array<{ ip: string; count: number }>;
        };
        threat_level: any;
        risk_score: number;
        time_range: string;
      }>('/dashboard/stats', params);
      
      return {
        totalEvents: response.stats.total_requests,
        blockedEvents: response.stats.blocked_requests,
        attackEvents: response.stats.attack_requests,
        blockRate: response.stats.block_rate,
        topAttackTypes: response.stats.top_attack_types || [],
        topSourceIps: response.stats.top_source_ips || []
      };
    } catch (error) {
      console.error('Failed to get dashboard stats:', error);
      // Return default values if API fails
      return {
        totalEvents: 0,
        blockedEvents: 0,
        attackEvents: 0,
        blockRate: 0,
        topAttackTypes: [],
        topSourceIps: []
      };
    }
  }

  async getRecentEvents(limit: number): Promise<SecurityEvent[]> {
    try {
      const response = await this.apiClient.get<{
        events: Array<{
          id: string;
          timestamp: string;
          source_ip: string;
          attack_type?: string;
          severity: string;
          blocked: boolean;
          risk_score: number;
        }>;
      }>('/dashboard/recent-events', { limit });
      
      return response.events.map(e => {
        let severity: SeverityLevel;
        const severityStr = e.severity?.toLowerCase() || 'low';
        switch (severityStr) {
          case 'critical':
            severity = SeverityLevel.CRITICAL;
            break;
          case 'high':
            severity = SeverityLevel.HIGH;
            break;
          case 'medium':
            severity = SeverityLevel.MEDIUM;
            break;
          default:
            severity = SeverityLevel.LOW;
        }
        
        return new SecurityEventEntity(
          e.id,
          new Date(e.timestamp),
          e.source_ip,
          '',  // target_website not provided in recent events
          HttpMethod.GET,  // method not provided
          200,  // status_code not provided
          severity,
          e.blocked,
          [],  // rules not provided
          0,  // anomaly_score not provided
          e.attack_type as AttackType | undefined
        );
      });
    } catch (error) {
      console.error('Failed to get recent events:', error);
      // Return empty array if API fails
      return [];
    }
  }

  async getBySourceIp(ip: string): Promise<SecurityEvent[]> {
    const { events } = await this.getAll({ sourceIp: ip });
    return events;
  }
}