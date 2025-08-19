# Dashboard API endpoints
from fastapi import APIRouter, Depends, Query
from datetime import datetime, timedelta
from ...infrastructure.timezone import get_kst_now
from typing import Optional
from sqlalchemy.orm import Session

from ...infrastructure.database import get_db
from ...infrastructure.repositories.security_event_repository import SecurityEventRepository
from ...domain.services.security_analysis_service import SecurityAnalysisService
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/stats")
async def get_dashboard_stats(
    time_range: str = Query("24h", description="Time range: 24h, 7d, 30d"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get dashboard statistics"""
    # Calculate date range
    end_date = get_kst_now()
    if time_range == "24h":
        start_date = end_date - timedelta(hours=24)
    elif time_range == "7d":
        start_date = end_date - timedelta(days=7)
    elif time_range == "30d":
        start_date = end_date - timedelta(days=30)
    else:
        start_date = end_date - timedelta(hours=24)
    
    # Get repository
    repo = SecurityEventRepository(db)
    
    # Get aggregated stats from DB - no individual event fetching needed
    stats = await repo.get_stats(start_date, end_date)
    
    # Calculate threat level from aggregated stats instead of individual events
    analysis_service = SecurityAnalysisService()
    threat_level = analysis_service.calculate_threat_level_from_stats(stats)
    
    # Calculate risk score from aggregated stats (not individual events)
    total = stats.get('total_events', 0)
    if total > 0:
        attack_rate = stats.get('attack_events', 0) / total * 100
        block_rate = stats.get('block_rate', 0)
        avg_risk_score = min(100, (attack_rate * 0.6) + (block_rate * 0.4))
    else:
        avg_risk_score = 0
    
    return {
        "stats": stats,
        "threat_level": threat_level,
        "risk_score": round(avg_risk_score, 2),
        "time_range": time_range
    }

@router.get("/recent-events")
async def get_recent_events(
    limit: int = Query(10, le=50),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get recent security events"""
    repo = SecurityEventRepository(db)
    events = await repo.get_recent_events(limit)
    
    return {
        "events": [
            {
                "id": e.event_id,
                "timestamp": e.timestamp.isoformat(),
                "source_ip": e.source_ip,
                "attack_type": e.attack_type,
                "severity": e.severity,
                "blocked": e.is_blocked,
                "risk_score": e.risk_score
            }
            for e in events
        ]
    }

@router.get("/attack-patterns")
async def get_attack_patterns(
    time_range: str = Query("24h"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get attack pattern analysis"""
    # Calculate date range
    end_date = get_kst_now()
    if time_range == "24h":
        start_date = end_date - timedelta(hours=24)
    elif time_range == "7d":
        start_date = end_date - timedelta(days=7)
    elif time_range == "30d":
        start_date = end_date - timedelta(days=30)
    else:
        start_date = end_date - timedelta(hours=24)
    
    repo = SecurityEventRepository(db)
    patterns = await repo.get_attack_patterns(start_date, end_date)
    
    return {"patterns": patterns}

@router.get("/suspicious-ips")
async def get_suspicious_ips(
    time_range: str = Query("24h"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get suspicious IP addresses"""
    # Calculate date range
    end_date = get_kst_now()
    if time_range == "24h":
        start_date = end_date - timedelta(hours=24)
    elif time_range == "7d":
        start_date = end_date - timedelta(days=7)
    else:
        start_date = end_date - timedelta(hours=24)
    
    repo = SecurityEventRepository(db)
    events, _ = await repo.get_all(
        skip=0,
        limit=5000,
        filters={"start_date": start_date, "end_date": end_date}
    )
    
    analysis_service = SecurityAnalysisService()
    suspicious_ips = analysis_service.identify_suspicious_ips(events)
    
    return {"suspicious_ips": suspicious_ips[:20]}  # Return top 20