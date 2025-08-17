// Security and WAF related types
import type { SecurityEvent } from './SecurityEvent';

export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface EventFiltersState {
  search: string;
  severity: string;
  attackType: string;
  isBlocked: string;
  startDate: string;
  endDate: string;
  sourceIp: string;
  destinationIp: string;
  domain: string;
  method: string;
  statusCode: string;
  riskScore: string;
}

export interface AttackTest {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST';
  payload?: any;
  headers?: Record<string, string>;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  expectedOutcome?: string;
  icon?: React.ReactNode;
  payloads?: { label: string; value: string; description?: string; }[];
  requiresFile?: boolean;
}

export interface TestResult {
  testId?: string;
  testName?: string;
  test?: string;
  payload?: string;
  success?: boolean;
  blocked: boolean;
  responseCode?: number;
  status?: number | string;
  responseTime: number;
  message?: string;
  details?: any;
  timestamp: string;
}

export interface WafConfig {
  id: string;
  name: string;
  enabled: boolean;
  paranoia_level: number;
  anomaly_threshold: number;
  custom_rules: Array<{
    id: string;
    pattern: string;
    action: 'BLOCK' | 'LOG' | 'ALLOW';
    enabled: boolean;
  }>;
  ip_whitelist: string[];
  ip_blacklist: string[];
  updated_at: string;
  updated_by?: string;
}

export interface WafLogEntry {
  id: string;
  log_unique_id: string;
  timestamp: string;
  source_ip: string;
  source_port: number | null;
  dest_ip: string | null;
  dest_port: number | null;
  target_website: string | null;
  method: string;
  uri: string;
  status_code: number;
  is_blocked: boolean;
  is_attack: boolean;
  attack_types: string[] | null;
  rule_ids: string[] | null;
  rule_files: string[] | null;
  severity_score: number;
  anomaly_score: number;
  raw_log: any;
  created_at?: string;
}

export interface AttackDetail {
  message: string;
  data: string;
  rule_id: string;
  file: string;
}

export interface WafLogsResponse {
  logs: WafLogEntry[];
  total: number;
  page: number;
  pages: number;
  has_next: boolean;
}

export interface WafStats {
  total_requests: number;
  blocked_requests: number;
  block_rate: number;
  attack_types: Record<string, number>;
  top_source_ips: Record<string, number>;
  recent_attacks: WafLogEntry[];
}

// Event table component props
export interface EventTableProps {
  events: SecurityEvent[];
  loading: boolean;
  onEventClick: (event: SecurityEvent) => void;
}

export interface EventDetailsModalProps {
  event: SecurityEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export interface EventFiltersProps {
  filters: EventFiltersState;
  onFilterChange: (filters: EventFiltersState) => void;
  onExport: () => void;
  eventCount: number;
}

// Re-export SecurityEvent from its own file
export type { SecurityEvent } from './SecurityEvent';