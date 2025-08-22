// Main SecurityEvent interface used throughout the application
export interface SecurityEvent {
  id: string;
  event_id?: string; // Legacy field for backward compatibility
  timestamp: string;
  source_ip: string;
  source_port?: number;
  destination_ip?: string;
  destination_port?: number;
  uri: string;
  method: string;
  attack_type: string | null;
  severity: string;
  is_blocked: boolean;
  is_attack: boolean;
  anomaly_score: number;
  status_code: number;
  rules_matched?: any[];
  rule_files?: string[];
  request_headers?: any;
  response_headers?: any;
  request_body?: string;
  response_time?: number;
  risk_score?: number;
  target_website?: string;
  user_agent?: string;
  raw_audit_log?: any;
  country?: string;
  city?: string;
}

// Enums for type safety
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD'
}

export enum AttackType {
  XSS = 'XSS',
  SQL_INJECTION = 'SQLI',
  PATH_TRAVERSAL = 'LFI',
  REMOTE_FILE_INCLUSION = 'RFI',
  COMMAND_INJECTION = 'RCE',
  PHP_INJECTION = 'PHP',
  SCANNER = 'SCANNER',
  PROTOCOL_VIOLATION = 'PROTOCOL'
}

export enum SeverityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}