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
  matched_rules?: any[]; // Legacy field for backward compatibility
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