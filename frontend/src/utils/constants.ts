/**
 * Application constants and configuration values
 */

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost/api/ws';

// Timeouts (milliseconds)
export const API_REQUEST_TIMEOUT = Number(import.meta.env.VITE_API_REQUEST_TIMEOUT) || 5000;
export const WEBSOCKET_TIMEOUT = Number(import.meta.env.VITE_WEBSOCKET_TIMEOUT) || 30000;
export const NOTIFICATION_DISPLAY_TIME = Number(import.meta.env.VITE_NOTIFICATION_DISPLAY_TIME) || 3000;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// File Upload
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_FILE_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'pdf', 'txt', 
  'doc', 'docx', 'exe', 'bat', 'sh', 'php', 
  'asp', 'jsp'
];

// Security Thresholds
export const ANOMALY_SCORE_THRESHOLD = 5;
export const SEVERITY_SCORES = {
  CRITICAL: 90,
  HIGH: 70,
  MEDIUM: 40,
  LOW: 20
};

// Chart Configuration
export const CHART_COLORS = {
  primary: '#0071E3',
  success: '#30D158',
  warning: '#FFD60A',
  danger: '#FF453A',
  info: '#0A84FF'
};

// Attack Types
export const ATTACK_TYPES = [
  'XSS',
  'SQL Injection',
  'Path Traversal',
  'Command Injection',
  'File Upload',
  'XXE',
  'SSTI',
  'SSRF',
  'Header Manipulation',
  'User-Agent Bypass'
];

// Demo Values (only for testing)
export const DEMO_IPS = ['127.0.0.1', '192.168.1.1', '10.0.0.1'];

// Feature Flags
export const ENABLE_WEBSOCKET = import.meta.env.VITE_ENABLE_WEBSOCKET !== 'false';
export const ENABLE_GOOGLE_AUTH = import.meta.env.VITE_ENABLE_GOOGLE_AUTH === 'true';

// Application Info
export const APP_TITLE = import.meta.env.VITE_APP_TITLE || 'WAF Security Operations Center';
export const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || 'production';