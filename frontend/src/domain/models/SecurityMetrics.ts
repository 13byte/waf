// Domain Model for Security Metrics
export interface SecurityMetrics {
  id: string;
  timestamp: Date;
  totalRequests: number;
  blockedRequests: number;
  allowedRequests: number;
  blockRate: number;
  anomalyScore: number;
  threatLevel: ThreatLevel;
  attackTypes: AttackTypeDistribution[];
  topThreats: ThreatSource[];
}

export enum ThreatLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

export interface AttackTypeDistribution {
  type: AttackType;
  count: number;
  percentage: number;
}

export enum AttackType {
  XSS = 'XSS',
  SQL_INJECTION = 'SQLI',
  RCE = 'RCE',
  LFI = 'LFI',
  RFI = 'RFI',
  PATH_TRAVERSAL = 'PATH_TRAVERSAL',
  SCANNER = 'SCANNER',
  DDOS = 'DDOS',
  BRUTE_FORCE = 'BRUTE_FORCE',
  OTHER = 'OTHER'
}

export interface ThreatSource {
  ip: string;
  country: string;
  countryCode: string;
  requestCount: number;
  blockedCount: number;
  threatScore: number;
  lastSeen: Date;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface TimeSeriesData {
  time: Date;
  value: number;
  label?: string;
}

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  sourceIp: string;
  targetUrl: string;
  method: string;
  statusCode: number;
  attackType?: AttackType;
  isBlocked: boolean;
  severity: ThreatLevel;
  details?: Record<string, any>;
}