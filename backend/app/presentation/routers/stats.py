# WAF Statistics endpoint for dashboard and analytics
from fastapi import APIRouter, Depends, Query
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, Integer

from ...infrastructure.database import get_db
from ...domain.models.security_event import SecurityEvent
from ..dependencies import get_current_user
from ...services.geoip_service import geoip_service

router = APIRouter(prefix="/api/monitoring", tags=["Monitoring"])

@router.get("/stats")
async def get_monitoring_stats(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get WAF statistics for the given time range"""
    
    # Default to last 24 hours if no dates provided
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(hours=24)
    
    # Query statistics
    query = db.query(SecurityEvent).filter(
        SecurityEvent.timestamp >= start_date,
        SecurityEvent.timestamp <= end_date
    )
    
    total_requests = query.count()
    blocked_requests = query.filter(SecurityEvent.is_blocked == True).count()
    attack_requests = query.filter(SecurityEvent.is_attack == True).count()
    
    # Get attack type distribution
    attack_types = db.query(
        SecurityEvent.attack_type,
        func.count(SecurityEvent.id).label('count')
    ).filter(
        SecurityEvent.timestamp >= start_date,
        SecurityEvent.timestamp <= end_date,
        SecurityEvent.attack_type.isnot(None)
    ).group_by(SecurityEvent.attack_type).all()
    
    # Get top attacking IPs
    top_ips = db.query(
        SecurityEvent.source_ip,
        func.count(SecurityEvent.id).label('count')
    ).filter(
        SecurityEvent.timestamp >= start_date,
        SecurityEvent.timestamp <= end_date,
        SecurityEvent.is_attack == True
    ).group_by(SecurityEvent.source_ip).order_by(
        func.count(SecurityEvent.id).desc()
    ).limit(10).all()
    
    # Get severity distribution
    severity_dist = db.query(
        SecurityEvent.severity,
        func.count(SecurityEvent.id).label('count')
    ).filter(
        SecurityEvent.timestamp >= start_date,
        SecurityEvent.timestamp <= end_date
    ).group_by(SecurityEvent.severity).all()
    
    # Calculate time-based trends
    # Determine appropriate time interval based on date range
    duration = end_date - start_date
    if duration <= timedelta(hours=1):
        # For 1 hour range, use 5-minute intervals
        interval = timedelta(minutes=5)
        current_time = start_date.replace(minute=(start_date.minute // 5) * 5, second=0, microsecond=0)
    elif duration <= timedelta(hours=24):
        # For 24 hour range, use 30-minute intervals
        interval = timedelta(minutes=30)
        current_time = start_date.replace(minute=(start_date.minute // 30) * 30, second=0, microsecond=0)
    elif duration <= timedelta(days=7):
        # For 7 day range, use hourly intervals
        interval = timedelta(hours=1)
        current_time = start_date.replace(minute=0, second=0, microsecond=0)
    else:
        # For longer ranges, use daily intervals
        interval = timedelta(days=1)
        current_time = start_date.replace(hour=0, minute=0, second=0, microsecond=0)
    
    hourly_stats = []
    while current_time <= end_date:
        next_time = current_time + interval
        time_query = db.query(SecurityEvent).filter(
            SecurityEvent.timestamp >= current_time,
            SecurityEvent.timestamp < next_time
        )
        hourly_stats.append({
            "hour": current_time.isoformat(),
            "total": time_query.count(),
            "blocked": time_query.filter(SecurityEvent.is_blocked == True).count(),
            "attacks": time_query.filter(SecurityEvent.is_attack == True).count()
        })
        current_time = next_time
    
    # Get HTTP method distribution
    method_stats = db.query(
        SecurityEvent.method,
        func.count(SecurityEvent.id).label('count')
    ).filter(
        SecurityEvent.timestamp >= start_date,
        SecurityEvent.timestamp <= end_date
    ).group_by(SecurityEvent.method).all()
    
    # Get response code distribution
    response_codes = db.query(
        SecurityEvent.status_code,
        func.count(SecurityEvent.id).label('count')
    ).filter(
        SecurityEvent.timestamp >= start_date,
        SecurityEvent.timestamp <= end_date
    ).group_by(SecurityEvent.status_code).order_by(
        func.count(SecurityEvent.id).desc()
    ).limit(10).all()
    
    # Get geographic distribution using GeoIP service
    country_requests = {}
    country_attacks = {}
    
    # Get actual IP distribution from security events
    ip_stats = db.query(
        SecurityEvent.source_ip,
        func.count(SecurityEvent.id).label('total_count'),
        func.sum(func.cast(SecurityEvent.is_attack, Integer)).label('attack_count')
    ).filter(
        SecurityEvent.timestamp >= start_date,
        SecurityEvent.timestamp <= end_date
    ).group_by(SecurityEvent.source_ip).all()
    
    # Use GeoIP service to classify IPs by country
    for ip_stat in ip_stats:
        ip = ip_stat[0]
        requests = ip_stat[1]
        attacks = ip_stat[2] or 0
        
        # Get country info from GeoIP service
        country_info = geoip_service.get_country_info(ip)
        country = country_info.get("country", "Unknown")
        
        country_requests[country] = country_requests.get(country, 0) + requests
        country_attacks[country] = country_attacks.get(country, 0) + attacks
    
    # Convert to list format
    country_stats = []
    for country in country_requests:
        country_stats.append({
            "country": country,
            "requests": country_requests[country],
            "attacks": country_attacks[country]
        })
    
    # Sort by request count
    country_stats.sort(key=lambda x: x['requests'], reverse=True)

    return {
        "time_range": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat()
        },
        "summary": {
            "total_requests": total_requests,
            "blocked_requests": blocked_requests,
            "attack_requests": attack_requests,
            "block_rate": (blocked_requests / total_requests * 100) if total_requests > 0 else 0,
            "attack_rate": (attack_requests / total_requests * 100) if total_requests > 0 else 0
        },
        "attack_types": [
            {"type": at[0], "count": at[1]} for at in attack_types
        ],
        "top_attacking_ips": [
            {"ip": ip[0], "count": ip[1]} for ip in top_ips
        ],
        "severity_distribution": [
            {"severity": s[0], "count": s[1]} for s in severity_dist
        ],
        "method_stats": [
            {"method": m[0], "count": m[1]} for m in method_stats
        ],
        "response_codes": [
            {"code": str(r[0]), "count": r[1]} for r in response_codes
        ],
        "country_stats": country_stats,
        "hourly_trends": hourly_stats
    }