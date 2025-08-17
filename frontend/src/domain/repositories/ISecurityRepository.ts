import { SecurityMetrics, SecurityEvent, ThreatSource, TimeSeriesData } from '../models/SecurityMetrics';

export interface ISecurityRepository {
  // Metrics
  getMetrics(): Promise<SecurityMetrics>;
  getMetricsHistory(hours: number): Promise<TimeSeriesData[]>;
  
  // Events
  getSecurityEvents(filters?: SecurityEventFilters): Promise<SecurityEvent[]>;
  getEventById(id: string): Promise<SecurityEvent>;
  
  // Threats
  getTopThreats(limit?: number): Promise<ThreatSource[]>;
  getThreatGeography(): Promise<ThreatSource[]>;
  
  // Real-time
  subscribeToEvents(callback: (event: SecurityEvent) => void): () => void;
  subscribeToMetrics(callback: (metrics: SecurityMetrics) => void): () => void;
}

export interface SecurityEventFilters {
  startDate?: Date;
  endDate?: Date;
  attackType?: string;
  isBlocked?: boolean;
  severity?: string;
  sourceIp?: string;
  limit?: number;
  offset?: number;
}