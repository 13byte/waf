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
    time_range: str = Query("24h", description="Time range: 1h, 24h, 7d, 30d"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get dashboard statistics"""
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
    
    # Get repository
    repo = SecurityEventRepository(db)
    
    # Get aggregated stats from DB - no individual event fetching needed
    stats = await repo.get_stats(start_date, end_date)
    
    # Calculate system health based on recent performance
    from sqlalchemy import func, case
    from ...domain.models.security_event import SecurityEvent
    
    # Calculate average response time from recent events
    recent_events = db.query(
        func.avg(SecurityEvent.response_time).label('avg_response')
    ).filter(
        SecurityEvent.timestamp >= start_date,
        SecurityEvent.timestamp <= end_date
    ).first()
    
    avg_response_time = recent_events.avg_response if recent_events and recent_events.avg_response else None
    
    # If response_time is not available, estimate from status codes
    if avg_response_time is None:
        # Use a simple estimation based on successful vs failed requests
        # MySQL doesn't support FILTER clause, use CASE instead
        success_rate = db.query(
            func.sum(case((SecurityEvent.status_code < 400, 1), else_=0))
        ).filter(
            SecurityEvent.timestamp >= start_date,
            SecurityEvent.timestamp <= end_date  
        ).scalar()
        
        total = stats.get('total_requests', 0)
        if total > 0:
            success_pct = (success_rate / total) * 100 if success_rate else 0
            # Estimate response time based on success rate
            avg_response_time = 50 if success_pct > 95 else 150
        else:
            avg_response_time = 100
    
    # Calculate system health score
    system_health = 100.0
    if stats.get('total_requests', 0) > 0:
        # Factor in block rate (lower is better for health)
        block_rate = stats.get('block_rate', 0)
        if block_rate > 50:
            system_health -= 20
        elif block_rate > 30:
            system_health -= 10
        elif block_rate > 10:
            system_health -= 5
        
        # Factor in attack rate
        attack_rate = stats.get('attack_requests', 0) / stats.get('total_requests', 1) * 100
        if attack_rate > 50:
            system_health -= 15
        elif attack_rate > 30:
            system_health -= 10
        elif attack_rate > 10:
            system_health -= 5
    
    # Calculate percentage changes for comparison with previous period
    prev_end_date = start_date
    time_delta = end_date - start_date
    prev_start_date = prev_end_date - time_delta
    
    prev_stats = await repo.get_stats(prev_start_date, prev_end_date)
    
    # Calculate percentage changes
    changes = {}
    for key in ['total_requests', 'blocked_requests', 'attack_requests']:
        current = stats.get(key, 0)
        previous = prev_stats.get(key, 0)
        if previous > 0:
            change_pct = ((current - previous) / previous) * 100
        else:
            change_pct = 100 if current > 0 else 0
        changes[f"{key}_change"] = round(change_pct, 1)
    
    # Get time-based trends using analytics logic
    from sqlalchemy import distinct
    
    # Determine aggregation period based on time range
    if time_range == "1h":
        agg_period = "5min"
    elif time_range == "24h":
        agg_period = "hourly"
    elif time_range == "7d":
        agg_period = "6hour"  
    else:
        agg_period = "daily"
    
    # Build time format for grouping
    if agg_period == "5min":
        time_format = func.concat(
            func.date_format(SecurityEvent.timestamp, '%Y-%m-%d %H:'),
            func.lpad(func.floor(func.minute(SecurityEvent.timestamp) / 5) * 5, 2, '0'),
            ':00'
        )
    elif agg_period == "hourly":
        time_format = func.date_format(SecurityEvent.timestamp, '%Y-%m-%d %H:00:00')
    elif agg_period == "6hour":
        time_format = func.concat(
            func.date_format(SecurityEvent.timestamp, '%Y-%m-%d '),
            func.lpad(func.floor(func.hour(SecurityEvent.timestamp) / 6) * 6, 2, '0'),
            ':00:00'
        )
    else:  # daily
        time_format = func.date(SecurityEvent.timestamp)
    
    # Get time-based statistics
    time_stats = db.query(
        time_format.label('period'),
        func.count(SecurityEvent.id).label('total'),
        func.sum(case((SecurityEvent.is_blocked == True, 1), else_=0)).label('blocked'),
        func.sum(case((SecurityEvent.is_attack == True, 1), else_=0)).label('attacks')
    ).filter(
        SecurityEvent.timestamp >= start_date.replace(tzinfo=None),
        SecurityEvent.timestamp <= end_date.replace(tzinfo=None)
    ).group_by(time_format).order_by(time_format).all()
    
    # Format for frontend
    hourly_trends = []
    for stat in time_stats:
        if agg_period == "5min":
            label = str(stat.period).split()[1] if ' ' in str(stat.period) else str(stat.period)
        elif agg_period == "hourly":
            label = str(stat.period).split()[1].split(':')[0] + ':00' if ' ' in str(stat.period) else str(stat.period)
        elif agg_period == "daily":
            label = str(stat.period).split('-')[1] + '/' + str(stat.period).split('-')[2] if '-' in str(stat.period) else str(stat.period)
        else:
            label = str(stat.period)
        
        hourly_trends.append({
            "label": label,
            "total": stat.total or 0,
            "blocked": stat.blocked or 0,
            "attacks": stat.attacks or 0
        })
    
    # Calculate threat level from aggregated stats instead of individual events
    analysis_service = SecurityAnalysisService()
    threat_level = analysis_service.calculate_threat_level_from_stats(stats)
    
    # Calculate risk score from aggregated stats (not individual events)
    total = stats.get('total_requests', 0)
    if total > 0:
        attack_rate = stats.get('attack_requests', 0) / total * 100
        block_rate = stats.get('block_rate', 0)
        avg_risk_score = min(100, (attack_rate * 0.6) + (block_rate * 0.4))
    else:
        avg_risk_score = 0
    
    return {
        "stats": stats,
        "threat_level": threat_level,
        "risk_score": round(avg_risk_score, 2),
        "system_health": round(system_health, 1),
        "avg_response_time": round(avg_response_time, 0),
        "changes": changes,
        "time_range": time_range,
        "hourly_trends": hourly_trends
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