// Security event repository implementation
import { ISecurityEventRepository, SecurityEventFilter, PaginationParams, SecurityEventStats } from '../../domain/repositories/ISecurityEventRepository';
import { SecurityEvent, SecurityEventEntity, HttpMethod, AttackType, SeverityLevel } from '../../domain/entities/SecurityEvent';
import { TimeRange } from '../../domain/value-objects/TimeRange';
import { ApiClient } from '../api/ApiClient';

interface ApiSecurityEvent {
  id: string;
  timestamp: string;
  source_ip: string;
  target_website: string;
  method: string;
  uri: string;
  status_code: number;
  attack_types?: string[];
  severity_score: number;
  is_blocked: boolean;
  rule_ids: string[];
  anomaly_score: number;
}

export class SecurityEventRepository implements ISecurityEventRepository {
  constructor(private apiClient: ApiClient) {}

  private mapApiToEntity(apiEvent: ApiSecurityEvent): SecurityEvent {
    // Map severity score to level
    let severity: SeverityLevel;
    if (apiEvent.severity_score >= 7) severity = SeverityLevel.CRITICAL;
    else if (apiEvent.severity_score >= 5) severity = SeverityLevel.HIGH;
    else if (apiEvent.severity_score >= 3) severity = SeverityLevel.MEDIUM;
    else severity = SeverityLevel.LOW;

    return new SecurityEventEntity(
      apiEvent.id,
      new Date(apiEvent.timestamp),
      apiEvent.source_ip,
      apiEvent.target_website || apiEvent.uri,
      apiEvent.method as HttpMethod,
      apiEvent.status_code,
      severity,
      apiEvent.is_blocked,
      apiEvent.rule_ids,
      apiEvent.anomaly_score,
      apiEvent.attack_types?.[0] as AttackType | undefined
    );
  }

  async getAll(filter?: SecurityEventFilter, pagination?: PaginationParams): Promise<{ events: SecurityEvent[]; total: number }> {
    const params: Record<string, any> = {};
    
    if (pagination) {
      params.skip = (pagination.page - 1) * pagination.limit;
      params.limit = pagination.limit;
    }
    
    if (filter) {
      if (filter.sourceIp) params.source_ip = filter.sourceIp;
      if (filter.attackType) params.attack_type = filter.attackType;
      if (filter.blocked !== undefined) params.blocked_only = filter.blocked;
      if (filter.search) params.search = filter.search;
      if (filter.timeRange) {
        params.start_date = filter.timeRange.startDate.toISOString();
        params.end_date = filter.timeRange.endDate.toISOString();
      }
    }
    
    const response = await this.apiClient.get<{
      logs: ApiSecurityEvent[];
      total: number;
    }>('/monitoring/logs', params);
    
    return {
      events: response.logs.map(log => this.mapApiToEntity(log)),
      total: response.total
    };
  }

  async getById(id: string): Promise<SecurityEvent | null> {
    try {
      const response = await this.apiClient.get<ApiSecurityEvent>(`/monitoring/logs/${id}`);
      return this.mapApiToEntity(response);
    } catch {
      return null;
    }
  }

  async getStats(timeRange?: TimeRange): Promise<SecurityEventStats> {
    const params: Record<string, any> = {};
    
    if (timeRange) {
      params.start_date = timeRange.startDate.toISOString();
      params.end_date = timeRange.endDate.toISOString();
    }
    
    const response = await this.apiClient.get<{
      total_requests: number;
      blocked_requests: number;
      attack_requests: number;
      block_rate: number;
      top_attack_types: Array<{ type: string; count: number }>;
      top_source_ips: Array<{ ip: string; count: number }>;
    }>('/monitoring/stats', params);
    
    return {
      totalEvents: response.total_requests,
      blockedEvents: response.blocked_requests,
      attackEvents: response.attack_requests,
      blockRate: response.block_rate,
      topAttackTypes: response.top_attack_types || [],
      topSourceIps: response.top_source_ips || []
    };
  }

  async getRecentEvents(limit: number): Promise<SecurityEvent[]> {
    const { events } = await this.getAll(undefined, { page: 1, limit });
    return events;
  }

  async getBySourceIp(ip: string): Promise<SecurityEvent[]> {
    const { events } = await this.getAll({ sourceIp: ip });
    return events;
  }
}