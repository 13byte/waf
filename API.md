# API Documentation

Base URL: `http://localhost/api`

## Authentication

### Login
```
POST /auth/login
Body: { "username": "admin", "password": "admin123" }
Response: { "access_token": "jwt_token", "token_type": "bearer" }
```

### Register
```
POST /auth/register
Body: { "username": "user", "email": "user@example.com", "password": "password" }
Response: { "id": 1, "username": "user", "email": "user@example.com" }
```

## Dashboard

### Get Statistics
```
GET /dashboard/stats?time_range=24h
Headers: Authorization: Bearer {token}
Response: {
  "stats": { "total_requests": 100, "blocked_requests": 20 },
  "threat_level": { "level": "medium", "score": 45 },
  "risk_score": 32.5
}
```

### Recent Events
```
GET /dashboard/recent-events?limit=10
Headers: Authorization: Bearer {token}
Response: { "events": [...] }
```

### Attack Patterns
```
GET /dashboard/attack-patterns?time_range=24h
Headers: Authorization: Bearer {token}
Response: { "patterns": [...] }
```

## Security Events

### List Events
```
GET /security-events?page=1&page_size=20&search=192.168
Headers: Authorization: Bearer {token}
Response: {
  "events": [...],
  "pagination": { "page": 1, "page_size": 20, "total": 100 }
}
```

### Get Event Details
```
GET /security-events/{event_id}
Headers: Authorization: Bearer {token}
Response: { event details }
```

### Events by IP
```
GET /security-events/by-ip/{ip}?limit=50
Headers: Authorization: Bearer {token}
Response: { "ip": "192.168.1.1", "threat_profile": {...}, "events": [...] }
```

### WebSocket Stream
```
WS /security-events/stream
Headers: Authorization: Bearer {token}
Message: { "type": "events", "data": [...] }
```

## WAF Configuration

### Get Config
```
GET /waf/config
Headers: Authorization: Bearer {token}
Response: { "paranoia_level": 1, "rule_engine": true, ... }
```

### Update Config
```
PUT /waf/config
Headers: Authorization: Bearer {token}
Body: { "paranoia_level": 2 }
Response: { updated config }
```

### Manage IPs
```
POST /waf/config/blocked-ips
Body: { "ip": "192.168.1.100" }

DELETE /waf/config/blocked-ips/{ip}
```

### Custom Rules
```
GET /waf/config/rules
POST /waf/config/rules
DELETE /waf/config/rules/{rule_id}
```

## Attack Testing Lab

### XSS Test
```
POST /vulnerable/xss
Body: { "input": "<script>alert('xss')</script>" }
```

### SQL Injection Test
```
POST /vulnerable/sqli
Body: { "input": "' OR '1'='1" }
```

### Path Traversal Test
```
POST /vulnerable/lfi
Body: { "file": "../../../etc/passwd" }
```

### Command Injection Test
```
POST /vulnerable/rce
Body: { "command": "ls -la" }
```

## Response Codes

- `200` - Success
- `201` - Created
- `400` - Bad request
- `401` - Not authenticated
- `403` - Not authorized
- `404` - Not found
- `500` - Server error