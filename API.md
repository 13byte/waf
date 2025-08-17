# WAF Security Operations Center - API Documentation

Complete API reference for the WAF monitoring and testing platform.

## Base URL

- **Production**: `http://localhost/api`
- **Development**: `http://localhost:8000/api`
- **API Docs**: `http://localhost/api/docs` (Swagger UI)

## Authentication

All endpoints require JWT token authentication except public attack testing endpoints.

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@waftest.com",
  "role": "ADMIN",
  "created_at": "2025-01-15T10:30:00"
}
```

## Security Events

### List Security Events
```http
GET /api/security-events
Authorization: Bearer <token>
```

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `page_size` (int): Items per page (default: 20, max: 100)
- `search` (string): Search in IP, URI, or website
- `attack_type` (string): Filter by attack type
- `severity` (string): Filter by severity (low, medium, high, critical)
- `blocked_only` (bool): Show only blocked events
- `attacks_only` (bool): Show only attack events
- `source_ip` (string): Filter by source IP
- `method` (string): HTTP method filter
- `start_date` (datetime): Start date filter
- `end_date` (datetime): End date filter

**Response:**
```json
{
  "events": [
    {
      "id": "evt_123456",
      "timestamp": "2025-01-15T14:30:45",
      "source_ip": "192.168.1.100",
      "source_port": 54321,
      "destination_ip": "192.168.1.1",
      "destination_port": 80,
      "target_website": "localhost",
      "uri": "/api/vulnerable/xss",
      "method": "GET",
      "status_code": 403,
      "attack_type": "XSS",
      "severity": "high",
      "is_attack": true,
      "is_blocked": true,
      "anomaly_score": 15,
      "risk_score": 85.5,
      "rules_matched": ["941100", "941110"],
      "rule_files": ["REQUEST-941-APPLICATION-ATTACK-XSS.conf"],
      "user_agent": "Mozilla/5.0..."
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

### Get Security Event Details
```http
GET /api/security-events/{event_id}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "evt_123456",
  "timestamp": "2025-01-15T14:30:45",
  "source_ip": "192.168.1.100",
  "attack_type": "XSS",
  "severity": "high",
  "is_blocked": true,
  "request_headers": {
    "User-Agent": "Mozilla/5.0...",
    "Accept": "text/html,application/xhtml+xml"
  },
  "request_body": "input_data=<script>alert('xss')</script>",
  "response_headers": {
    "Content-Type": "application/json"
  },
  "raw_audit_log": { ... }
}
```

### Events by Source IP
```http
GET /api/security-events/by-ip/{ip}
Authorization: Bearer <token>
```

**Response:**
```json
{
  "ip": "192.168.1.100",
  "threat_profile": {
    "total_requests": 45,
    "attack_count": 12,
    "blocked_count": 8,
    "attack_types": ["XSS", "SQLI", "LFI"],
    "threat_score": 75
  },
  "events": [...]
}
```

### Export Events to CSV
```http
GET /api/security-events/export
Authorization: Bearer <token>
```

**Response:** CSV file download with security events data

### Real-time Event Stream (WebSocket)
```javascript
const ws = new WebSocket('ws://localhost/api/ws/security-events');

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  if (data.type === 'critical_event') {
    console.log('Critical security event:', data.data);
  }
};
```

## Dashboard API

### Dashboard Statistics
```http
GET /api/dashboard/stats?time_range=24h
Authorization: Bearer <token>
```

**Query Parameters:**
- `time_range`: 24h, 7d, 30d (default: 24h)

**Response:**
```json
{
  "stats": {
    "total_requests": 1250,
    "blocked_requests": 95,
    "attack_requests": 120,
    "block_rate": 7.6,
    "top_attack_types": [
      {"type": "XSS", "count": 45},
      {"type": "SQLI", "count": 38}
    ],
    "top_source_ips": [
      {"ip": "192.168.1.100", "count": 25}
    ]
  },
  "threat_level": {
    "level": "medium",
    "score": 45,
    "reasons": ["Moderate attack rate"]
  },
  "risk_score": 42.5
}
```

### Recent Events
```http
GET /api/dashboard/recent-events?limit=10
Authorization: Bearer <token>
```

**Response:**
```json
{
  "events": [
    {
      "id": "evt_123456",
      "timestamp": "2025-01-15T14:30:45",
      "source_ip": "192.168.1.100",
      "attack_type": "XSS",
      "severity": "high",
      "blocked": true,
      "risk_score": 85.5
    }
  ]
}
```

## Analytics API

### Aggregated Statistics
```http
GET /api/analytics/aggregated-stats
Authorization: Bearer <token>
```

**Query Parameters:**
- `start_date` (datetime): Start date
- `end_date` (datetime): End date  
- `period` (string): hourly or daily (default: daily)
- `use_cache` (bool): Enable caching (default: true)

**Response:**
```json
{
  "summary": {
    "total_requests": 5420,
    "blocked_requests": 380,
    "attack_requests": 450,
    "block_rate": 7.0,
    "attack_rate": 8.3,
    "unique_ips": 125,
    "unique_attack_types": 8
  },
  "daily_stats": [
    {
      "date": "2025-01-15",
      "total_requests": 1250,
      "blocked_requests": 95,
      "attack_requests": 120,
      "unique_ips": 35,
      "critical_events": 5,
      "high_events": 25,
      "medium_events": 65,
      "low_events": 25
    }
  ],
  "attack_types": [
    {
      "type": "XSS",
      "count": 125,
      "blocked_count": 98,
      "avg_severity": 7.5
    }
  ],
  "top_ips": [
    {
      "ip": "192.168.1.100",
      "total_requests": 45,
      "attack_requests": 12,
      "blocked_requests": 8,
      "threat_score": 26.7
    }
  ]
}
```

### Period Comparison
```http
GET /api/analytics/comparison
Authorization: Bearer <token>
```

**Query Parameters:**
- `period1_start` (datetime): First period start
- `period1_end` (datetime): First period end
- `period2_start` (datetime): Second period start
- `period2_end` (datetime): Second period end

**Response:**
```json
{
  "period1": {
    "start": "2025-01-08T00:00:00",
    "end": "2025-01-14T23:59:59",
    "stats": {
      "total_requests": 4800,
      "blocked_requests": 320,
      "attack_requests": 380
    }
  },
  "period2": {
    "start": "2025-01-15T00:00:00", 
    "end": "2025-01-21T23:59:59",
    "stats": {
      "total_requests": 5420,
      "blocked_requests": 380,
      "attack_requests": 450
    }
  },
  "changes": {
    "total_requests": {
      "value": 620,
      "percentage": 12.9
    },
    "blocked_requests": {
      "value": 60,
      "percentage": 18.8
    }
  }
}
```

## Attack Testing Lab

All attack testing endpoints are public (no authentication required).

### XSS Testing
```http
GET /api/vulnerable/xss?input_data=<script>alert('xss')</script>
```

### SQL Injection Testing
```http
GET /api/vulnerable/sqli?user_id=' OR '1'='1
```

### Path Traversal Testing
```http
GET /api/vulnerable/path-traversal?file_path=../../../etc/passwd
```

### Command Injection Testing
```http
GET /api/vulnerable/command-injection?command=; ls -la&execution_type=shell
```

### File Upload Testing
```http
POST /api/vulnerable/file-upload
Content-Type: multipart/form-data

file: <binary_data>
upload_path: ../../../tmp
bypass_validation: true
custom_extension: .php
```

### XXE Injection Testing
```http
POST /api/vulnerable/xxe
Content-Type: application/xml

<?xml version="1.0"?>
<!DOCTYPE root [<!ENTITY test SYSTEM "file:///etc/passwd">]>
<root>&test;</root>
```

### SSTI Testing
```http
GET /api/vulnerable/ssti?template={{7*7}}
```

### SSRF Testing
```http
GET /api/vulnerable/ssrf?url=http://127.0.0.1/
```

### Header Manipulation Testing
```http
GET /api/vulnerable/header-manipulation
X-Admin-Access: true
X-Forwarded-For: 192.168.1.100
```

### User Agent Bypass Testing
```http
GET /api/vulnerable/user-agent?access_level=admin
User-Agent: adminbot
```

## GeoIP Management

### GeoIP Database Status
```http
GET /api/geoip/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "uploaded": true,
  "filename": "GeoLite2-City.mmdb",
  "last_updated": "2025-01-15T10:30:00",
  "file_size": 52428800
}
```

### Upload GeoIP Database
```http
POST /api/geoip/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary_data>
```

### Delete GeoIP Database
```http
DELETE /api/geoip/database
Authorization: Bearer <token>
```

## WebSocket Events

### Connection
```javascript
const ws = new WebSocket('ws://localhost/api/ws/security-events');
```

### Event Types
- `connection`: Initial connection confirmation
- `critical_event`: High severity or blocked events
- `heartbeat`: Keep-alive message

### Critical Event Format
```json
{
  "type": "critical_event",
  "data": {
    "id": "evt_123456",
    "timestamp": "2025-01-15T14:30:45",
    "source_ip": "192.168.1.100",
    "attack_type": "XSS",
    "severity": "HIGH",
    "is_blocked": true
  }
}
```

## Error Responses

### Standard Error Format
```json
{
  "detail": "Error message description"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized (invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `422` - Validation Error
- `500` - Internal Server Error

### Validation Error Format
```json
{
  "detail": [
    {
      "loc": ["query", "page_size"],
      "msg": "ensure this value is less than or equal to 100",
      "type": "value_error.number.not_le"
    }
  ]
}
```

## Rate Limiting

- Default: 100 requests per minute per IP
- Attack testing endpoints: 10 requests per minute per IP
- WebSocket connections: 5 concurrent connections per user

## Security Headers

All API responses include security headers:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: no-referrer-when-downgrade`