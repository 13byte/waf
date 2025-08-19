// Security event repository interface
import { SecurityEvent } from '../entities/SecurityEvent';
import { TimeRange } from '../value-objects/TimeRange';

export interface SecurityEventFilter {
  sourceIp?: string;
  attackType?: string;
  blocked?: boolean;
  timeRange?: TimeRange;
  severity?: string;
  search?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface SecurityEventStats {
  totalEvents: number;
  blockedEvents: number;
  attackEvents: number;
  blockRate: number;
  topAttackTypes: Array<{ type: string; count: number }>;
  topSourceIps: Array<{ ip: string; count: number }>;
  system_health?: number;
  avg_response_time?: number;
  changes?: {
    total_requests_change: number;
    blocked_requests_change: number;
    attack_requests_change: number;
  };
  hourly_trends?: Array<{
    label: string;
    total: number;
    blocked: number;
    attacks: number;
  }>;
}

export interface ISecurityEventRepository {
  getAll(filter?: SecurityEventFilter, pagination?: PaginationParams): Promise<{
    events: SecurityEvent[];
    total: number;
  }>;
  
  getById(id: string): Promise<SecurityEvent | null>;
  
  getStats(timeRange?: TimeRange): Promise<SecurityEventStats>;
  
  getRecentEvents(limit: number): Promise<SecurityEvent[]>;
  
  getBySourceIp(ip: string): Promise<SecurityEvent[]>;
}