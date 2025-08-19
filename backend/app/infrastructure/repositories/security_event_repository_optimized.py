# Optimized Security Event Repository with improved query performance
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import func, and_, or_, desc, asc, select
from sqlalchemy.sql import text
from ...domain.models.security_event import SecurityEvent
from ...domain.repositories.security_event_repository import SecurityEventRepository
from ...infrastructure.timezone import get_kst_now

class OptimizedSecurityEventRepository(SecurityEventRepository):
    def __init__(self, db: Session):
        self.db = db
        
    def get_all(
        self, 
        limit: int = 100, 
        offset: int = 0,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[SecurityEvent]:
        """Get all security events with optimized filtering"""
        query = self.db.query(SecurityEvent)
        
        if filters:
            # Build filter conditions efficiently
            conditions = []
            
            if filters.get('start_date'):
                conditions.append(SecurityEvent.timestamp >= filters['start_date'])
            if filters.get('end_date'):
                conditions.append(SecurityEvent.timestamp <= filters['end_date'])
            if filters.get('source_ip'):
                conditions.append(SecurityEvent.source_ip == filters['source_ip'])
            if filters.get('attack_type'):
                conditions.append(SecurityEvent.attack_type == filters['attack_type'])
            if filters.get('severity'):
                conditions.append(SecurityEvent.severity == filters['severity'])
            if filters.get('is_blocked') is not None:
                conditions.append(SecurityEvent.is_blocked == filters['is_blocked'])
            if filters.get('is_attack') is not None:
                conditions.append(SecurityEvent.is_attack == filters['is_attack'])
            
            # Apply all conditions at once
            if conditions:
                query = query.filter(and_(*conditions))
            
            # Search filter with optimized LIKE query
            if filters.get('search'):
                search_term = f"%{filters['search']}%"
                query = query.filter(
                    or_(
                        SecurityEvent.uri.like(search_term),
                        SecurityEvent.source_ip.like(search_term),
                        SecurityEvent.event_id.like(search_term)
                    )
                )
        
        # Use index-friendly ordering
        query = query.order_by(desc(SecurityEvent.timestamp))
        
        # Apply pagination
        return query.offset(offset).limit(limit).all()
    
    def get_by_id(self, event_id: str) -> Optional[SecurityEvent]:
        """Get event by ID with single query"""
        return self.db.query(SecurityEvent).filter(
            SecurityEvent.event_id == event_id
        ).first()
    
    def create(self, event_data: Dict[str, Any]) -> SecurityEvent:
        """Create new event with optimized insert"""
        event = SecurityEvent(**event_data)
        self.db.add(event)
        self.db.commit()
        return event
    
    def get_recent_attacks(self, limit: int = 10) -> List[SecurityEvent]:
        """Get recent attacks using index"""
        return self.db.query(SecurityEvent).filter(
            SecurityEvent.is_attack == True
        ).order_by(
            desc(SecurityEvent.timestamp)
        ).limit(limit).all()
    
    def get_stats(self, hours: int = 24) -> Dict[str, Any]:
        """Get statistics with single optimized query"""
        cutoff_time = get_kst_now() - timedelta(hours=hours)
        
        # Single query for all stats
        stats = self.db.query(
            func.count(SecurityEvent.id).label('total'),
            func.sum(func.cast(SecurityEvent.is_blocked, Integer)).label('blocked'),
            func.sum(func.cast(SecurityEvent.is_attack, Integer)).label('attacks'),
            func.count(func.distinct(SecurityEvent.source_ip)).label('unique_ips'),
            func.avg(SecurityEvent.anomaly_score).label('avg_score'),
            func.max(SecurityEvent.anomaly_score).label('max_score')
        ).filter(
            SecurityEvent.timestamp >= cutoff_time
        ).first()
        
        # Get top attack types with single query
        top_attacks = self.db.query(
            SecurityEvent.attack_type,
            func.count(SecurityEvent.id).label('count')
        ).filter(
            and_(
                SecurityEvent.timestamp >= cutoff_time,
                SecurityEvent.attack_type.isnot(None)
            )
        ).group_by(
            SecurityEvent.attack_type
        ).order_by(
            desc('count')
        ).limit(5).all()
        
        # Get severity distribution with single query
        severity_dist = self.db.query(
            SecurityEvent.severity,
            func.count(SecurityEvent.id).label('count')
        ).filter(
            SecurityEvent.timestamp >= cutoff_time
        ).group_by(
            SecurityEvent.severity
        ).all()
        
        return {
            'total_events': stats.total or 0,
            'blocked_events': stats.blocked or 0,
            'attack_events': stats.attacks or 0,
            'unique_ips': stats.unique_ips or 0,
            'avg_anomaly_score': float(stats.avg_score or 0),
            'max_anomaly_score': stats.max_score or 0,
            'top_attack_types': [
                {'type': attack.attack_type, 'count': attack.count}
                for attack in top_attacks
            ],
            'severity_distribution': {
                sev.severity: sev.count for sev in severity_dist
            }
        }
    
    def get_by_source_ip(self, source_ip: str, limit: int = 100) -> List[SecurityEvent]:
        """Get events by source IP using index"""
        return self.db.query(SecurityEvent).filter(
            SecurityEvent.source_ip == source_ip
        ).order_by(
            desc(SecurityEvent.timestamp)
        ).limit(limit).all()
    
    def get_threat_ips(self, threshold: int = 10, hours: int = 24) -> List[Dict[str, Any]]:
        """Get threatening IPs with optimized query"""
        cutoff_time = get_kst_now() - timedelta(hours=hours)
        
        threat_ips = self.db.query(
            SecurityEvent.source_ip,
            func.count(SecurityEvent.id).label('total_requests'),
            func.sum(func.cast(SecurityEvent.is_attack, Integer)).label('attack_count'),
            func.sum(func.cast(SecurityEvent.is_blocked, Integer)).label('blocked_count'),
            func.count(func.distinct(SecurityEvent.attack_type)).label('attack_types'),
            func.max(SecurityEvent.anomaly_score).label('max_score')
        ).filter(
            and_(
                SecurityEvent.timestamp >= cutoff_time,
                SecurityEvent.is_attack == True
            )
        ).group_by(
            SecurityEvent.source_ip
        ).having(
            func.sum(func.cast(SecurityEvent.is_attack, Integer)) >= threshold
        ).order_by(
            desc('attack_count')
        ).all()
        
        return [
            {
                'ip': ip.source_ip,
                'total_requests': ip.total_requests,
                'attack_count': ip.attack_count,
                'blocked_count': ip.blocked_count,
                'attack_types': ip.attack_types,
                'max_anomaly_score': ip.max_score,
                'threat_level': 'HIGH' if ip.attack_count > 50 else 'MEDIUM'
            }
            for ip in threat_ips
        ]
    
    def bulk_create(self, events: List[Dict[str, Any]]) -> int:
        """Bulk insert events for better performance"""
        if not events:
            return 0
        
        # Use bulk_insert_mappings for efficiency
        self.db.bulk_insert_mappings(SecurityEvent, events)
        self.db.commit()
        return len(events)
    
    def cleanup_old_events(self, days: int = 30) -> int:
        """Delete old events with optimized query"""
        cutoff_date = get_kst_now() - timedelta(days=days)
        
        # Use delete with filter for efficiency
        deleted = self.db.query(SecurityEvent).filter(
            SecurityEvent.timestamp < cutoff_date
        ).delete(synchronize_session=False)
        
        self.db.commit()
        return deleted

# Import fix for SQLAlchemy Integer type
from sqlalchemy import Integer