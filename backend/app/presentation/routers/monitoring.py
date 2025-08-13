# Security events monitoring endpoints
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
import json
import asyncio
from collections import defaultdict

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
    start_date: Optional[datetime] = Query(None, description="Start date"),
    end_date: Optional[datetime] = Query(None, description="End date"),
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
                "request_headers": e.request_headers,
                "response_headers": e.response_headers
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
    
    return {
        "id": event.event_id,
        "timestamp": event.timestamp.isoformat(),
        "source_ip": event.source_ip,
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
        "request_headers": event.request_headers,
        "request_body": event.request_body,
        "response_headers": event.response_headers,
        "response_body": event.response_body,
        "user_agent": event.user_agent,
        "geo_location": event.geo_location
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
    end_date = datetime.utcnow()
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

@router.websocket("/stream")
async def websocket_endpoint(websocket: WebSocket, db: Session = Depends(get_db)):
    """WebSocket endpoint for real-time event streaming"""
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        repo = SecurityEventRepository(db)
        
        while True:
            # Send latest events every 5 seconds
            events = await repo.get_recent_events(limit=5)
            
            data = {
                "type": "events",
                "data": [
                    {
                        "id": e.event_id,
                        "timestamp": e.timestamp.isoformat(),
                        "source_ip": e.source_ip,
                        "attack_type": e.attack_type,
                        "severity": e.severity,
                        "is_blocked": e.is_blocked
                    }
                    for e in events
                ]
            }
            
            await websocket.send_json(data)
            await asyncio.sleep(5)
            
    except WebSocketDisconnect:
        active_connections.remove(websocket)

@router.post("/broadcast")
async def broadcast_event(
    event: Dict[str, Any],
    current_user = Depends(get_current_user)
):
    """Broadcast event to all connected WebSocket clients"""
    for connection in active_connections:
        await connection.send_json({
            "type": "new_event",
            "data": event
        })
    
    return {"message": f"Broadcasted to {len(active_connections)} clients"}