# Real-time analytics endpoints - calculates directly from security_events
from fastapi import APIRouter, Depends, Query, HTTPException
from datetime import datetime, timedelta
from ...infrastructure.timezone import get_kst_now, KST
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, case, distinct, text
from pydantic import AwareDatetime
import json

from ...infrastructure.database import get_db
from ...domain.models.security_event import SecurityEvent
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/stats")
async def get_aggregated_stats(
    start_date: Optional[AwareDatetime] = Query(None),
    end_date: Optional[AwareDatetime] = Query(None),
    period: str = Query("daily", description="Aggregation period: hourly or daily"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get aggregated statistics calculated in real-time from security_events"""
    
    # Default to last 7 days if no dates provided
    if not end_date:
        end_date = get_kst_now()
    if not start_date:
        start_date = end_date - timedelta(days=7)
    
    try:
        # Calculate summary statistics
        summary_stats = db.query(
            func.count(SecurityEvent.id).label('total_requests'),
            func.sum(case((SecurityEvent.is_blocked == True, 1), else_=0)).label('blocked_requests'),
            func.sum(case((SecurityEvent.is_attack == True, 1), else_=0)).label('attack_requests'),
            func.count(distinct(SecurityEvent.source_ip)).label('unique_ips'),
            func.count(distinct(SecurityEvent.attack_type)).label('unique_attack_types'),
            func.avg(SecurityEvent.anomaly_score).label('avg_anomaly_score'),
            func.max(SecurityEvent.anomaly_score).label('max_anomaly_score')
        ).filter(
            SecurityEvent.timestamp >= start_date,
            SecurityEvent.timestamp <= end_date
        ).first()
        
        # Calculate time-based statistics
        if period == "hourly":
            # Use func.date_trunc or custom formatting to maintain timezone awareness
            time_format = func.date_format(SecurityEvent.timestamp, '%Y-%m-%d %H:00:00')
        else:  # daily
            time_format = func.date(SecurityEvent.timestamp)
        
        time_stats = db.query(
            time_format.label('period'),
            func.count(SecurityEvent.id).label('total_requests'),
            func.sum(case((SecurityEvent.is_blocked == True, 1), else_=0)).label('blocked_requests'),
            func.sum(case((SecurityEvent.is_attack == True, 1), else_=0)).label('attack_requests'),
            func.count(distinct(SecurityEvent.source_ip)).label('unique_ips'),
            func.sum(case((SecurityEvent.severity == 'CRITICAL', 1), else_=0)).label('critical_events'),
            func.sum(case((SecurityEvent.severity == 'HIGH', 1), else_=0)).label('high_events'),
            func.sum(case((SecurityEvent.severity == 'MEDIUM', 1), else_=0)).label('medium_events'),
            func.sum(case((SecurityEvent.severity == 'LOW', 1), else_=0)).label('low_events'),
            func.avg(SecurityEvent.anomaly_score).label('avg_anomaly_score')
        ).filter(
            SecurityEvent.timestamp >= start_date,
            SecurityEvent.timestamp <= end_date
        ).group_by(time_format).order_by(time_format).all()
        
        # Get attack type distribution
        attack_types = db.query(
            SecurityEvent.attack_type,
            func.count(SecurityEvent.id).label('count'),
            func.sum(case((SecurityEvent.is_blocked == True, 1), else_=0)).label('blocked_count'),
            func.avg(
                case(
                    (SecurityEvent.severity == 'CRITICAL', 10),
                    (SecurityEvent.severity == 'HIGH', 7),
                    (SecurityEvent.severity == 'MEDIUM', 5),
                    (SecurityEvent.severity == 'LOW', 3),
                    else_=1
                )
            ).label('avg_severity')
        ).filter(
            SecurityEvent.timestamp >= start_date,
            SecurityEvent.timestamp <= end_date,
            SecurityEvent.attack_type.isnot(None)
        ).group_by(SecurityEvent.attack_type).order_by(func.count(SecurityEvent.id).desc()).limit(10).all()
        
        # Get top IPs by request count
        top_ips = db.query(
            SecurityEvent.source_ip,
            func.count(SecurityEvent.id).label('total_requests'),
            func.sum(case((SecurityEvent.is_attack == True, 1), else_=0)).label('attack_requests'),
            func.sum(case((SecurityEvent.is_blocked == True, 1), else_=0)).label('blocked_requests'),
            func.count(distinct(SecurityEvent.attack_type)).label('unique_attack_types')
        ).filter(
            SecurityEvent.timestamp >= start_date,
            SecurityEvent.timestamp <= end_date
        ).group_by(SecurityEvent.source_ip).order_by(
            func.count(SecurityEvent.id).desc()
        ).limit(20).all()
        
        # Get severity distribution
        severity_dist = db.query(
            SecurityEvent.severity,
            func.count(SecurityEvent.id).label('count')
        ).filter(
            SecurityEvent.timestamp >= start_date,
            SecurityEvent.timestamp <= end_date,
            SecurityEvent.severity.isnot(None)
        ).group_by(SecurityEvent.severity).all()
        
        # Get HTTP method statistics
        method_stats = db.query(
            SecurityEvent.method,
            func.count(SecurityEvent.id).label('count')
        ).filter(
            SecurityEvent.timestamp >= start_date,
            SecurityEvent.timestamp <= end_date
        ).group_by(SecurityEvent.method).order_by(func.count(SecurityEvent.id).desc()).all()
        
        # Get response code statistics
        response_codes = db.query(
            SecurityEvent.status_code,
            func.count(SecurityEvent.id).label('count')
        ).filter(
            SecurityEvent.timestamp >= start_date,
            SecurityEvent.timestamp <= end_date
        ).group_by(SecurityEvent.status_code).order_by(func.count(SecurityEvent.id).desc()).all()
        
        # Get country statistics using GeoIP
        from ...services.geoip_service import geoip_service
        
        # Group by IP first
        ip_stats = db.query(
            SecurityEvent.source_ip,
            func.count(SecurityEvent.id).label('requests'),
            func.sum(case((SecurityEvent.is_attack == True, 1), else_=0)).label('attacks')
        ).filter(
            SecurityEvent.timestamp >= start_date,
            SecurityEvent.timestamp <= end_date
        ).group_by(SecurityEvent.source_ip).all()
        
        # Aggregate by country
        country_dict = {}
        for ip_stat in ip_stats:
            geo_data = geoip_service.get_country_info(ip_stat.source_ip)
            country = geo_data.get('country', 'Unknown') if geo_data else 'Unknown'
            
            if country not in country_dict:
                country_dict[country] = {'requests': 0, 'attacks': 0}
            
            country_dict[country]['requests'] += ip_stat.requests
            country_dict[country]['attacks'] += ip_stat.attacks or 0
        
        country_stats = [
            {
                'country': country,
                'requests': stats['requests'],
                'attacks': stats['attacks']
            }
            for country, stats in sorted(country_dict.items(), key=lambda x: x[1]['requests'], reverse=True)[:20]
        ]
        
        # Build response
        total_requests = summary_stats.total_requests or 0
        blocked_requests = summary_stats.blocked_requests or 0
        attack_requests = summary_stats.attack_requests or 0
        
        result = {
            "summary": {
                "total_requests": total_requests,
                "blocked_requests": blocked_requests,
                "attack_requests": attack_requests,
                "block_rate": (blocked_requests / total_requests * 100) if total_requests > 0 else 0,
                "attack_rate": (attack_requests / total_requests * 100) if total_requests > 0 else 0,
                "unique_ips": summary_stats.unique_ips or 0,
                "unique_attack_types": summary_stats.unique_attack_types or 0
            },
            f"{period}_stats": [
                {
                    "date" if period == "daily" else "hour": (
                        # For hourly stats, MySQL DATE_FORMAT returns KST time as string
                        # We need to properly parse and add timezone info
                        datetime.strptime(str(stat.period), '%Y-%m-%d %H:%M:%S').replace(tzinfo=KST).isoformat()
                        if period == "hourly" and isinstance(stat.period, str) and 'T' not in str(stat.period)
                        else (stat.period.isoformat() if hasattr(stat.period, 'isoformat') else str(stat.period))
                    ),
                    "total_requests": stat.total_requests,
                    "blocked_requests": stat.blocked_requests,
                    "attack_requests": stat.attack_requests,
                    "unique_ips": stat.unique_ips,
                    "critical_events": stat.critical_events,
                    "high_events": stat.high_events,
                    "medium_events": stat.medium_events,
                    "low_events": stat.low_events,
                    "avg_anomaly_score": float(stat.avg_anomaly_score) if stat.avg_anomaly_score else 0
                }
                for stat in time_stats
            ],
            "attack_types": [
                {
                    "type": attack.attack_type,
                    "count": attack.count,
                    "blocked_count": attack.blocked_count,
                    "avg_severity": float(attack.avg_severity) if attack.avg_severity else 0
                }
                for attack in attack_types
            ],
            "top_ips": [
                {
                    "ip": ip.source_ip,
                    "total_requests": ip.total_requests,
                    "attack_requests": ip.attack_requests,
                    "blocked_requests": ip.blocked_requests,
                    "threat_score": (float(ip.attack_requests) * 10.0 / float(ip.total_requests)) if ip.total_requests > 0 else 0
                }
                for ip in top_ips
            ],
            "severity_distribution": [
                {
                    "severity": sev.severity,
                    "count": sev.count
                }
                for sev in severity_dist
            ],
            "method_stats": [
                {
                    "method": method.method,
                    "count": method.count
                }
                for method in method_stats
            ],
            "response_codes": [
                {
                    "code": str(code.status_code),
                    "count": code.count
                }
                for code in response_codes
            ],
            "country_stats": country_stats
        }
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch analytics: {str(e)}")

@router.get("/comparison")
async def get_comparison_stats(
    period1_start: AwareDatetime = Query(..., description="Start of first period"),
    period1_end: AwareDatetime = Query(..., description="End of first period"),
    period2_start: AwareDatetime = Query(..., description="Start of second period"),
    period2_end: AwareDatetime = Query(..., description="End of second period"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Compare statistics between two time periods"""
    
    def get_period_stats(start: datetime, end: datetime) -> Dict:
        """Get stats for a specific period - real-time calculation"""
        result = db.query(
            func.count(SecurityEvent.id).label('total_requests'),
            func.sum(case((SecurityEvent.is_blocked == True, 1), else_=0)).label('blocked_requests'),
            func.sum(case((SecurityEvent.is_attack == True, 1), else_=0)).label('attack_requests'),
            func.count(distinct(SecurityEvent.source_ip)).label('unique_ips'),
            func.avg(SecurityEvent.anomaly_score).label('avg_anomaly_score'),
            func.max(SecurityEvent.anomaly_score).label('max_anomaly_score')
        ).filter(
            SecurityEvent.timestamp >= start,
            SecurityEvent.timestamp <= end
        ).first()
        
        attack_types = db.query(
            SecurityEvent.attack_type,
            func.count(SecurityEvent.id).label('count')
        ).filter(
            SecurityEvent.timestamp >= start,
            SecurityEvent.timestamp <= end,
            SecurityEvent.attack_type.isnot(None)
        ).group_by(SecurityEvent.attack_type).order_by(
            func.count(SecurityEvent.id).desc()
        ).limit(5).all()
        
        return {
            "total_requests": result.total_requests or 0,
            "blocked_requests": result.blocked_requests or 0,
            "attack_requests": result.attack_requests or 0,
            "unique_ips": result.unique_ips or 0,
            "avg_anomaly_score": float(result.avg_anomaly_score) if result.avg_anomaly_score else 0,
            "max_anomaly_score": result.max_anomaly_score or 0,
            "top_attack_types": [{"type": a.attack_type, "count": a.count} for a in attack_types]
        }
    
    period1_stats = get_period_stats(period1_start, period1_end)
    period2_stats = get_period_stats(period2_start, period2_end)
    
    # Calculate percentage changes
    def calc_change(old_val, new_val):
        if old_val == 0:
            return 100 if new_val > 0 else 0
        return ((new_val - old_val) / old_val) * 100
    
    comparison = {
        "period1": {
            "start": period1_start.isoformat(),
            "end": period1_end.isoformat(),
            "stats": period1_stats
        },
        "period2": {
            "start": period2_start.isoformat(),
            "end": period2_end.isoformat(),
            "stats": period2_stats
        },
        "changes": {
            "total_requests": {
                "value": period2_stats["total_requests"] - period1_stats["total_requests"],
                "percentage": calc_change(period1_stats["total_requests"], period2_stats["total_requests"])
            },
            "blocked_requests": {
                "value": period2_stats["blocked_requests"] - period1_stats["blocked_requests"],
                "percentage": calc_change(period1_stats["blocked_requests"], period2_stats["blocked_requests"])
            },
            "attack_requests": {
                "value": period2_stats["attack_requests"] - period1_stats["attack_requests"],
                "percentage": calc_change(period1_stats["attack_requests"], period2_stats["attack_requests"])
            },
            "unique_ips": {
                "value": period2_stats["unique_ips"] - period1_stats["unique_ips"],
                "percentage": calc_change(period1_stats["unique_ips"], period2_stats["unique_ips"])
            }
        }
    }
    
    return comparison

@router.get("/drill-down/{chart_type}")
async def get_drill_down_data(
    chart_type: str,
    value: str = Query(..., description="Value to drill down on"),
    start_date: Optional[AwareDatetime] = Query(None),
    end_date: Optional[AwareDatetime] = Query(None),
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get detailed data for drill-down from charts"""
    
    if not end_date:
        end_date = get_kst_now()
    if not start_date:
        start_date = end_date - timedelta(days=7)
    
    if chart_type == "attack_type":
        events = db.query(SecurityEvent).filter(
            SecurityEvent.attack_type == value,
            SecurityEvent.timestamp >= start_date,
            SecurityEvent.timestamp <= end_date
        ).order_by(SecurityEvent.timestamp.desc()).limit(limit).all()
        
        return {
            "chart_type": chart_type,
            "filter_value": value,
            "total_events": len(events),
            "events": [
                {
                    "id": e.event_id,
                    "timestamp": e.timestamp.isoformat(),
                    "source_ip": e.source_ip,
                    "uri": e.uri,
                    "method": e.method,
                    "status_code": e.status_code,
                    "is_blocked": e.is_blocked,
                    "anomaly_score": e.anomaly_score,
                    "severity": e.severity
                }
                for e in events
            ]
        }
    
    elif chart_type == "source_ip":
        events = db.query(SecurityEvent).filter(
            SecurityEvent.source_ip == value,
            SecurityEvent.timestamp >= start_date,
            SecurityEvent.timestamp <= end_date
        ).order_by(SecurityEvent.timestamp.desc()).limit(limit).all()
        
        attack_dist = db.query(
            SecurityEvent.attack_type,
            func.count(SecurityEvent.id).label('count')
        ).filter(
            SecurityEvent.source_ip == value,
            SecurityEvent.timestamp >= start_date,
            SecurityEvent.timestamp <= end_date,
            SecurityEvent.attack_type.isnot(None)
        ).group_by(SecurityEvent.attack_type).all()
        
        return {
            "chart_type": chart_type,
            "filter_value": value,
            "total_events": len(events),
            "attack_distribution": [
                {"type": a.attack_type, "count": a.count} for a in attack_dist
            ],
            "events": [
                {
                    "id": e.event_id,
                    "timestamp": e.timestamp.isoformat(),
                    "uri": e.uri,
                    "method": e.method,
                    "attack_type": e.attack_type,
                    "status_code": e.status_code,
                    "is_blocked": e.is_blocked,
                    "anomaly_score": e.anomaly_score
                }
                for e in events
            ]
        }
    
    elif chart_type == "severity":
        events = db.query(SecurityEvent).filter(
            SecurityEvent.severity == value.upper(),
            SecurityEvent.timestamp >= start_date,
            SecurityEvent.timestamp <= end_date
        ).order_by(SecurityEvent.timestamp.desc()).limit(limit).all()
        
        return {
            "chart_type": chart_type,
            "filter_value": value,
            "total_events": len(events),
            "events": [
                {
                    "id": e.event_id,
                    "timestamp": e.timestamp.isoformat(),
                    "source_ip": e.source_ip,
                    "uri": e.uri,
                    "attack_type": e.attack_type,
                    "is_blocked": e.is_blocked,
                    "anomaly_score": e.anomaly_score
                }
                for e in events
            ]
        }
    
    elif chart_type == "time_range":
        time_start = datetime.fromisoformat(value)
        time_end = time_start + timedelta(hours=1)
        
        events = db.query(SecurityEvent).filter(
            SecurityEvent.timestamp >= time_start,
            SecurityEvent.timestamp < time_end
        ).order_by(SecurityEvent.timestamp.desc()).limit(limit).all()
        
        return {
            "chart_type": chart_type,
            "filter_value": value,
            "time_range": {
                "start": time_start.isoformat(),
                "end": time_end.isoformat()
            },
            "total_events": len(events),
            "events": [
                {
                    "id": e.event_id,
                    "timestamp": e.timestamp.isoformat(),
                    "source_ip": e.source_ip,
                    "uri": e.uri,
                    "method": e.method,
                    "attack_type": e.attack_type,
                    "status_code": e.status_code,
                    "is_blocked": e.is_blocked,
                    "severity": e.severity
                }
                for e in events
            ]
        }
    
    else:
        raise HTTPException(status_code=400, detail=f"Invalid chart type: {chart_type}")