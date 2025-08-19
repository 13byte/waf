# Security events monitoring endpoints
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from datetime import datetime, timedelta
from ...infrastructure.timezone import get_kst_now
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from pydantic import AwareDatetime
import json
import asyncio
import csv
import io

from ...infrastructure.database import get_db
from ...infrastructure.repositories.security_event_repository import SecurityEventRepository
from ...domain.services.security_analysis_service import SecurityAnalysisService
from ..dependencies import get_current_user
from ...infrastructure.cache import cache_manager

router = APIRouter(prefix="/api/security-events", tags=["Security Events"])

# Store active WebSocket connections
active_connections: List[WebSocket] = []

@router.get("")
async def get_security_events(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search in IP, URI, or website"),
    attack_type: Optional[str] = Query(None, description="Filter by attack type"),
    severity: Optional[str] = Query(None, description="Filter by severity level"),
    blocked_only: bool = Query(False, description="Show only blocked events"),
    attacks_only: bool = Query(False, description="Show only attack events"),
    source_ip: Optional[str] = Query(None, description="Filter by source IP"),
    destination_ip: Optional[str] = Query(None, description="Filter by destination IP"),
    domain: Optional[str] = Query(None, description="Filter by domain/target website"),
    method: Optional[str] = Query(None, description="Filter by HTTP method"),
    start_date: Optional[AwareDatetime] = Query(None, description="Start date with timezone"),
    end_date: Optional[AwareDatetime] = Query(None, description="End date with timezone"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get security events with filters and pagination"""
    
    # Build filters
    filters = {}
    if search:
        filters["search"] = search
    if attack_type:
        filters["attack_type"] = attack_type
    if severity:
        filters["severity"] = severity
    if blocked_only:
        filters["blocked_only"] = True
    if attacks_only:
        filters["is_attack_only"] = True
    if source_ip:
        filters["source_ip"] = source_ip
    if destination_ip:
        filters["destination_ip"] = destination_ip
    if domain:
        filters["domain"] = domain
    if method:
        filters["method"] = method
    if start_date:
        filters["start_date"] = start_date
    if end_date:
        filters["end_date"] = end_date
    
    # Get events from repository
    repo = SecurityEventRepository(db)
    skip = (page - 1) * page_size
    events, total = await repo.get_all(skip=skip, limit=page_size, filters=filters)
    
    # Calculate risk scores
    analysis_service = SecurityAnalysisService()
    
    return {
        "events": [
            {
                "id": e.event_id,
                "timestamp": e.timestamp.isoformat(),
                "source_ip": e.source_ip,
                "source_port": e.source_port,
                "destination_ip": e.destination_ip,
                "destination_port": e.destination_port,
                "target_website": e.target_website,
                "uri": e.uri,
                "method": e.method,
                "status_code": e.status_code,
                "attack_type": e.attack_type,
                "severity": e.severity,
                "is_attack": e.is_attack,
                "is_blocked": e.is_blocked,
                "anomaly_score": e.anomaly_score,
                "risk_score": analysis_service.calculate_risk_score(e),
                "rules_matched": e.rules_matched or [],
                "rule_files": e.rule_files or [],
                "request_headers": e.request_headers,
                "response_headers": e.response_headers,
                "user_agent": e.user_agent
            }
            for e in events
        ],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size
        }
    }

@router.get("/{event_id}")
async def get_security_event(
    event_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get single security event details"""
    repo = SecurityEventRepository(db)
    event = await repo.get_by_id(event_id)
    
    if not event:
        return {"error": "Event not found"}
    
    analysis_service = SecurityAnalysisService()
    
    # Try to get raw log from WafLog table
    raw_audit_log = None
    try:
        # Import WafLog model dynamically to avoid circular imports
        from sqlalchemy import text
        result = db.execute(
            text("SELECT raw_log FROM waf_logs WHERE timestamp = :ts AND source_ip = :ip AND uri = :uri LIMIT 1"),
            {"ts": event.timestamp, "ip": event.source_ip, "uri": event.uri}
        ).first()
        if result and result[0]:
            raw_audit_log = result[0]
    except Exception as e:
        # If we can't get raw log, it's not critical
        pass
    
    return {
        "id": event.event_id,
        "timestamp": event.timestamp.isoformat(),
        "source_ip": event.source_ip,
        "source_port": event.source_port,
        "destination_ip": event.destination_ip,
        "destination_port": event.destination_port,
        "target_website": event.target_website,
        "uri": event.uri,
        "method": event.method,
        "status_code": event.status_code,
        "attack_type": event.attack_type,
        "severity": event.severity,
        "is_attack": event.is_attack,
        "is_blocked": event.is_blocked,
        "anomaly_score": event.anomaly_score,
        "risk_score": analysis_service.calculate_risk_score(event),
        "rules_matched": event.rules_matched or [],
        "rule_files": event.rule_files or [],
        "request_headers": event.request_headers,
        "request_body": event.request_body,
        "response_headers": event.response_headers,
        "response_body": event.response_body,
        "user_agent": event.user_agent,
        "geo_location": event.geo_location,
        "raw_audit_log": raw_audit_log
    }

@router.get("/by-ip/{ip}")
async def get_events_by_ip(
    ip: str,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all events from a specific IP"""
    repo = SecurityEventRepository(db)
    events = await repo.get_by_source_ip(ip)
    events = events[:limit]
    
    analysis_service = SecurityAnalysisService()
    
    # Calculate IP threat profile
    threat_profile = {
        "total_requests": len(events),
        "attack_count": sum(1 for e in events if e.is_attack),
        "blocked_count": sum(1 for e in events if e.is_blocked),
        "attack_types": list(set(e.attack_type for e in events if e.attack_type)),
        "threat_score": 0
    }
    
    if threat_profile["total_requests"] > 0:
        attack_rate = threat_profile["attack_count"] / threat_profile["total_requests"]
        block_rate = threat_profile["blocked_count"] / threat_profile["total_requests"]
        threat_profile["threat_score"] = min(100, int(
            attack_rate * 40 + 
            block_rate * 30 + 
            len(threat_profile["attack_types"]) * 10
        ))
    
    return {
        "ip": ip,
        "threat_profile": threat_profile,
        "events": [
            {
                "id": e.event_id,
                "timestamp": e.timestamp.isoformat(),
                "uri": e.uri,
                "attack_type": e.attack_type,
                "severity": e.severity,
                "is_blocked": e.is_blocked,
                "risk_score": analysis_service.calculate_risk_score(e)
            }
            for e in events
        ]
    }

@router.get("/stats/summary")
async def get_event_stats(
    time_range: str = Query("24h", description="Time range: 1h, 24h, 7d, 30d"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get event statistics with caching"""
    
    # Check cache first
    cache_key = f"event_stats_{time_range}"
    cached = await cache_manager.get(cache_key)
    if cached:
        return cached
    
    # Calculate date range
    end_date = get_kst_now()
    if time_range == "1h":
        start_date = end_date - timedelta(hours=1)
    elif time_range == "24h":
        start_date = end_date - timedelta(hours=24)
    elif time_range == "7d":
        start_date = end_date - timedelta(days=7)
    elif time_range == "30d":
        start_date = end_date - timedelta(days=30)
    else:
        start_date = end_date - timedelta(hours=24)
    
    repo = SecurityEventRepository(db)
    stats = await repo.get_stats(start_date, end_date)
    
    # Cache for 5 minutes
    await cache_manager.set(cache_key, stats, ttl=300)
    
    return stats

@router.get("/export")
async def export_security_events(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Export all security events as CSV"""
    repo = SecurityEventRepository(db)
    analysis_service = SecurityAnalysisService()
    
    # Get all events (no pagination)
    events, _ = await repo.get_all(skip=0, limit=100000)
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header with more professional column names
    writer.writerow([
        'Date & Time',
        'Source IP',
        'Source Port', 
        'Destination IP',
        'Destination Port',
        'Target Domain',
        'Request Method',
        'Request URI',
        'Response Status',
        'Attack Classification',
        'Severity Level',
        'Action Taken',
        'Risk Score',
        'Anomaly Score',
        'Matched Rules',
        'User Agent',
        'Country'
    ])
    
    # Write data rows
    for event in events:
        # Format timestamp
        timestamp = event.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        
        # Format action taken
        action = 'BLOCKED' if event.is_blocked else 'ALLOWED'
        
        # Format matched rules
        rules = ', '.join(event.rules_matched) if event.rules_matched else 'N/A'
        
        # Get country from geo_location
        country = 'Unknown'
        if event.geo_location:
            try:
                geo = json.loads(event.geo_location) if isinstance(event.geo_location, str) else event.geo_location
                country = geo.get('country', 'Unknown')
            except:
                country = 'Unknown'
        
        writer.writerow([
            timestamp,
            event.source_ip,
            event.source_port or '',
            event.destination_ip or '',
            event.destination_port or '',
            event.target_website or '',
            event.method,
            event.uri,
            event.status_code,
            event.attack_type or 'Normal',
            event.severity or 'INFO',
            action,
            analysis_service.calculate_risk_score(event),
            event.anomaly_score or 0,
            rules,
            event.user_agent or '',
            country
        ])
    
    # Return CSV as download
    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),  # UTF-8 with BOM for Excel
        media_type='text/csv',
        headers={
            'Content-Disposition': f'attachment; filename=waf-security-log-{get_kst_now().strftime("%Y%m%d")}.csv'
        }
    )

@router.websocket("/stream")
async def websocket_endpoint(websocket: WebSocket, db: Session = Depends(get_db)):
    """WebSocket endpoint for real-time event streaming"""
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        # Send initial connection success
        await websocket.send_json({"type": "connected", "message": "WebSocket connected"})
        
        # Handle incoming messages (like ping)
        while True:
            message = await websocket.receive_text()
            if message == "ping":
                await websocket.send_text("pong")
            
    except WebSocketDisconnect:
        active_connections.remove(websocket)
    finally:
        if websocket in active_connections:
            active_connections.remove(websocket)

@router.post("/broadcast")
async def broadcast_event(
    event: Dict[str, Any]
):
    """Broadcast critical events to WebSocket clients (called by log processor)"""
    # Only broadcast critical events (HIGH severity or BLOCKED)
    if event.get("severity") == "HIGH" or event.get("is_blocked") == True:
        # Broadcast to all connected clients
        disconnected = []
        for connection in active_connections:
            try:
                await connection.send_json({
                    "type": "critical_event",
                    "data": event
                })
            except Exception:
                # Connection is closed, mark for removal
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            if conn in active_connections:
                active_connections.remove(conn)
        
        return {"message": f"Critical event broadcasted to {len(active_connections)} clients"}
    
    return {"message": "Event not critical, skipping broadcast"}