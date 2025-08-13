# Security event repository implementation
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_, or_
from ...domain.repositories.security_event_repository import ISecurityEventRepository
from ...domain.models.security_event import SecurityEvent, AttackType

class SecurityEventRepository(ISecurityEventRepository):
    
    def __init__(self, db: Session):
        self.db = db
    
    async def get_all(
        self, 
        skip: int = 0, 
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> tuple[List[SecurityEvent], int]:
        """Get all events with pagination and filters"""
        query = self.db.query(SecurityEvent)
        
        if filters:
            if filters.get("search"):
                search = f"%{filters['search']}%"
                query = query.filter(
                    or_(
                        SecurityEvent.source_ip.like(search),
                        SecurityEvent.uri.like(search),
                        SecurityEvent.target_website.like(search)
                    )
                )
            
            if filters.get("attack_type"):
                query = query.filter(SecurityEvent.attack_type == filters["attack_type"])
            
            if filters.get("blocked_only"):
                query = query.filter(SecurityEvent.is_blocked == True)
            
            if filters.get("is_attack_only"):
                query = query.filter(SecurityEvent.is_attack == True)
            
            if filters.get("severity"):
                query = query.filter(SecurityEvent.severity == filters["severity"])
            
            if filters.get("start_date"):
                query = query.filter(SecurityEvent.timestamp >= filters["start_date"])
            
            if filters.get("end_date"):
                query = query.filter(SecurityEvent.timestamp <= filters["end_date"])
            
            if filters.get("source_ip"):
                query = query.filter(SecurityEvent.source_ip == filters["source_ip"])
            
            if filters.get("destination_ip"):
                query = query.filter(SecurityEvent.destination_ip == filters["destination_ip"])
            
            if filters.get("domain"):
                query = query.filter(SecurityEvent.target_website.like(f"%{filters['domain']}%"))
            
            if filters.get("method"):
                query = query.filter(SecurityEvent.method == filters["method"])
        
        # Get total count
        total = query.count()
        
        # Apply pagination and ordering
        events = query.order_by(desc(SecurityEvent.timestamp)).offset(skip).limit(limit).all()
        
        return events, total
    
    async def get_by_id(self, event_id: str) -> Optional[SecurityEvent]:
        """Get event by ID"""
        return self.db.query(SecurityEvent).filter(
            SecurityEvent.event_id == event_id
        ).first()
    
    async def create(self, event: SecurityEvent) -> SecurityEvent:
        """Create new event"""
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event
    
    async def get_stats(
        self, 
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get statistics for dashboard"""
        query = self.db.query(SecurityEvent)
        
        if start_date:
            query = query.filter(SecurityEvent.timestamp >= start_date)
        if end_date:
            query = query.filter(SecurityEvent.timestamp <= end_date)
        
        total_events = query.count()
        blocked_events = query.filter(SecurityEvent.is_blocked == True).count()
        attack_events = query.filter(SecurityEvent.is_attack == True).count()
        
        # Get top attack types
        attack_types = self.db.query(
            SecurityEvent.attack_type,
            func.count(SecurityEvent.id).label('count')
        ).filter(
            SecurityEvent.attack_type.isnot(None)
        ).group_by(
            SecurityEvent.attack_type
        ).order_by(
            desc('count')
        ).limit(5).all()
        
        # Get top source IPs
        top_ips = self.db.query(
            SecurityEvent.source_ip,
            func.count(SecurityEvent.id).label('count')
        ).group_by(
            SecurityEvent.source_ip
        ).order_by(
            desc('count')
        ).limit(10).all()
        
        return {
            "total_requests": total_events,
            "blocked_requests": blocked_events,
            "attack_requests": attack_events,
            "block_rate": (blocked_events / total_events * 100) if total_events > 0 else 0,
            "top_attack_types": [
                {"type": t[0], "count": t[1]} for t in attack_types
            ],
            "top_source_ips": [
                {"ip": ip[0], "count": ip[1]} for ip in top_ips
            ]
        }
    
    async def get_recent_events(self, limit: int = 10) -> List[SecurityEvent]:
        """Get recent events"""
        return self.db.query(SecurityEvent).order_by(
            desc(SecurityEvent.timestamp)
        ).limit(limit).all()
    
    async def get_by_source_ip(self, ip: str) -> List[SecurityEvent]:
        """Get events by source IP"""
        return self.db.query(SecurityEvent).filter(
            SecurityEvent.source_ip == ip
        ).order_by(desc(SecurityEvent.timestamp)).all()
    
    async def get_attack_patterns(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """Get attack patterns analysis"""
        query = self.db.query(
            SecurityEvent.attack_type,
            func.count(SecurityEvent.id).label('frequency'),
            func.count(func.distinct(SecurityEvent.source_ip)).label('unique_ips')
        ).filter(
            SecurityEvent.is_attack == True,
            SecurityEvent.attack_type.isnot(None)
        )
        
        if start_date:
            query = query.filter(SecurityEvent.timestamp >= start_date)
        if end_date:
            query = query.filter(SecurityEvent.timestamp <= end_date)
        
        patterns = query.group_by(
            SecurityEvent.attack_type
        ).order_by(desc('frequency')).all()
        
        return [
            {
                "type": p[0],
                "frequency": p[1],
                "unique_sources": p[2]
            }
            for p in patterns
        ]