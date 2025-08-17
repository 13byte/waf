# Security event repository interface
from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from datetime import datetime
from ..models.security_event import SecurityEvent

class ISecurityEventRepository(ABC):
    
    @abstractmethod
    async def get_all(
        self, 
        skip: int = 0, 
        limit: int = 100,
        filters: Optional[Dict[str, Any]] = None
    ) -> tuple[List[SecurityEvent], int]:
        """Get all events with pagination and filters"""
        pass
    
    @abstractmethod
    async def get_by_id(self, event_id: str) -> Optional[SecurityEvent]:
        """Get event by ID"""
        pass
    
    @abstractmethod
    async def create(self, event: SecurityEvent) -> SecurityEvent:
        """Create new event"""
        pass
    
    @abstractmethod
    async def get_stats(
        self, 
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get statistics for dashboard"""
        pass
    
    @abstractmethod
    async def get_recent_events(self, limit: int = 10) -> List[SecurityEvent]:
        """Get recent events"""
        pass
    
    @abstractmethod
    async def get_by_source_ip(self, ip: str) -> List[SecurityEvent]:
        """Get events by source IP"""
        pass
    
    @abstractmethod
    async def get_attack_patterns(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Dict[str, Any]]:
        """Get attack patterns analysis"""
        pass