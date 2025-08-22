# Security Event Repository with optimized query performance
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, Integer
from ...domain.models.security_event import SecurityEvent
from ...domain.repositories.security_event_repository import ISecurityEventRepository
from ...infrastructure.timezone import get_kst_now

class SecurityEventRepository(ISecurityEventRepository):
    def __init__(self, db: Session):
        self.db = db
    
    async def get_all(
        self, 
        skip: int = 0, 
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> Tuple[List[SecurityEvent], int]:
        """Get all security events with optimized filtering and pagination"""
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
            if filters.get('destination_ip'):
                conditions.append(SecurityEvent.destination_ip == filters['destination_ip'])
            if filters.get('domain') or filters.get('target_website'):
                target = filters.get('domain') or filters.get('target_website')
                conditions.append(SecurityEvent.target_website == target)
            if filters.get('method'):
                conditions.append(SecurityEvent.method == filters['method'])
            if filters.get('attack_type'):
                conditions.append(SecurityEvent.attack_type == filters['attack_type'])
            if filters.get('severity'):
                conditions.append(SecurityEvent.severity == filters['severity'])
            if filters.get('blocked_only'):
                conditions.append(SecurityEvent.is_blocked == True)
            if filters.get('is_attack_only'):
                conditions.append(SecurityEvent.is_attack == True)
            
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
                        SecurityEvent.target_website.like(search_term),
                        SecurityEvent.event_id.like(search_term)
                    )
                )
        
        # Get total count before pagination
        total = query.count()
        
        # Use index-friendly ordering and apply pagination
        events = query.order_by(desc(SecurityEvent.timestamp)).offset(skip).limit(limit).all()
        
        return events, total
    
    async def get_by_id(self, event_id: str) -> Optional[SecurityEvent]:
        """Get event by ID with single query"""
        return self.db.query(SecurityEvent).filter(
            SecurityEvent.event_id == event_id
        ).first()
    
    async def create(self, event: SecurityEvent) -> SecurityEvent:
        """Create new event with optimized insert"""
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event
    
    async def get_stats(
        self, 
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get statistics with single optimized query"""
        query = self.db.query(SecurityEvent)
        
        if start_date:
            query = query.filter(SecurityEvent.timestamp >= start_date)
        if end_date:
            query = query.filter(SecurityEvent.timestamp <= end_date)
        
        # Single query for all stats
        stats = self.db.query(
            func.count(SecurityEvent.id).label('total'),
            func.sum(func.cast(SecurityEvent.is_blocked, Integer)).label('blocked'),
            func.sum(func.cast(SecurityEvent.is_attack, Integer)).label('attacks'),
            func.count(func.distinct(SecurityEvent.source_ip)).label('unique_ips'),
            func.avg(SecurityEvent.anomaly_score).label('avg_score'),
            func.max(SecurityEvent.anomaly_score).label('max_score')
        )
        
        if start_date:
            stats = stats.filter(SecurityEvent.timestamp >= start_date)
        if end_date:
            stats = stats.filter(SecurityEvent.timestamp <= end_date)
        
        stats = stats.first()
        
        return {
            'total_events': stats.total or 0,
            'blocked_events': stats.blocked or 0,
            'attack_events': stats.attacks or 0,
            'unique_ips': stats.unique_ips or 0,
            'avg_anomaly_score': float(stats.avg_score or 0),
            'max_anomaly_score': stats.max_score or 0
        }
    
    async def get_recent_attacks(
        self, 
        limit: int = 10
    ) -> List[SecurityEvent]:
        """Get recent attacks using index"""
        return self.db.query(SecurityEvent).filter(
            SecurityEvent.is_attack == True
        ).order_by(
            desc(SecurityEvent.timestamp)
        ).limit(limit).all()
    
    async def get_recent_events(self, limit: int = 10) -> List[SecurityEvent]:
        """Get recent events"""
        return self.db.query(SecurityEvent).order_by(
            desc(SecurityEvent.timestamp)
        ).limit(limit).all()
    
    async def get_by_source_ip(self, ip: str) -> List[SecurityEvent]:
        """Get events by source IP using index"""
        return self.db.query(SecurityEvent).filter(
            SecurityEvent.source_ip == ip
        ).order_by(
            desc(SecurityEvent.timestamp)
        ).limit(100).all()
    
    async def get_threat_ips(
        self, 
        threshold: int = 10, 
        hours: int = 24
    ) -> List[Dict[str, Any]]:
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
    
    async def get_attack_patterns(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """Get attack patterns analysis"""
        query = self.db.query(
            SecurityEvent.attack_type,
            func.count(SecurityEvent.id).label('count'),
            func.count(func.distinct(SecurityEvent.source_ip)).label('unique_sources'),
            func.sum(func.cast(SecurityEvent.is_blocked, Integer)).label('blocked_count'),
            func.avg(SecurityEvent.anomaly_score).label('avg_score')
        ).filter(
            SecurityEvent.attack_type.isnot(None)
        )
        
        if start_date:
            query = query.filter(SecurityEvent.timestamp >= start_date)
        if end_date:
            query = query.filter(SecurityEvent.timestamp <= end_date)
        
        patterns = query.group_by(
            SecurityEvent.attack_type
        ).order_by(
            desc('count')
        ).all()
        
        return [
            {
                'attack_type': pattern.attack_type,
                'total_count': pattern.count,
                'unique_sources': pattern.unique_sources,
                'blocked_count': pattern.blocked_count,
                'avg_anomaly_score': float(pattern.avg_score or 0),
                'block_rate': (pattern.blocked_count / pattern.count * 100) if pattern.count > 0 else 0
            }
            for pattern in patterns
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