// Analytics related types
export interface AnalyticsData {
  summary: {
    total_requests: number;
    blocked_requests: number;
    attack_requests: number;
    unique_ips: number;
    block_rate: number;
    attack_rate: number;
  };
  top_attack_types: Array<{ type: string; count: number; percentage: number }>;
  top_source_ips: Array<{ ip: string; count: number; country?: string }>;
  hourly_stats: Array<{ hour: string; total: number; blocked: number; attacks: number }>;
  daily_stats: Array<{ date: string; total: number; blocked: number; attacks: number }>;
  severity_distribution: Array<{ severity: string; count: number }>;
  method_stats: Array<{ method: string; count: number; blocked: number }>;
  response_codes: Array<{ code: number; count: number }>;
}

export interface FilterPreset {
  id: string;
  name: string;
  filters: {
    dateRange?: string;
    severity?: string;
    attackType?: string;
  };
}

export interface ComparisonData {
  current: {
    total_requests: number;
    blocked_requests: number;
    attack_rate: number;
  };
  previous: {
    total_requests: number;
    blocked_requests: number;
    attack_rate: number;
  };
  changes: {
    total_requests_change: number;
    blocked_requests_change: number;
    attack_rate_change: number;
  };
}

export interface DrillDownData {
  type: 'attack_type' | 'source_ip' | 'uri';
  value: string;
  details: {
    timeline: Array<{ timestamp: string; count: number }>;
    related_ips?: string[];
    related_uris?: string[];
    severity_breakdown?: Record<string, number>;
  };
}

// Component prop types for analytics
export interface DateRangeSelectorProps {
  dateRangeType: 'preset' | 'custom';
  presetRange: string;
  customStartDate: string;
  customEndDate: string;
  onDateRangeTypeChange: (type: 'preset' | 'custom') => void;
  onPresetRangeChange: (range: string) => void;
  onCustomDateChange: (start: string, end: string) => void;
}