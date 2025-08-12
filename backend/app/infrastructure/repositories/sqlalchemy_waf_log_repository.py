from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_, and_
from app.domain.models.models import WafLog
from app.domain.repositories.waf_log_repository import WafLogRepository

class SQLAlchemyWafLogRepository(WafLogRepository):
    def __init__(self, db_session: Session):
        self.db_session = db_session

    def _apply_filters(self, query, search: str, attack_type: str, blocked_only: bool,
                      is_attack_only: bool = False, status_code: Optional[int] = None,
                      start_date: Optional[str] = None, end_date: Optional[str] = None):
        """Apply common filters to query"""
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    WafLog.uri.ilike(search_term),
                    WafLog.source_ip.ilike(search_term),
                    WafLog.target_website.ilike(search_term),
                    WafLog.method.ilike(search_term)
                )
            )
        
        if attack_type:
            # Fix: Use proper JSON contains for MySQL
            query = query.filter(func.json_contains(WafLog.attack_types, f'"{attack_type}"'))
        
        if blocked_only:
            query = query.filter(WafLog.is_blocked == True)
        
        if is_attack_only:
            query = query.filter(WafLog.is_attack == True)
        
        if status_code:
            query = query.filter(WafLog.status_code == status_code)
        
        if start_date:
            try:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                query = query.filter(WafLog.timestamp >= start_dt)
            except ValueError:
                pass  # Invalid date format, ignore
        
        if end_date:
            try:
                end_dt = datetime.strptime(end_date, "%Y-%m-%d")
                end_dt = end_dt.replace(hour=23, minute=59, second=59)
                query = query.filter(WafLog.timestamp <= end_dt)
            except ValueError:
                pass  # Invalid date format, ignore
        
        return query

    def get_logs(self, skip: int, limit: int, search: str, attack_type: str, 
                 blocked_only: bool, is_attack_only: bool = False, 
                 status_code: Optional[int] = None, start_date: Optional[str] = None, 
                 end_date: Optional[str] = None) -> List[WafLog]:
        query = self.db_session.query(WafLog)
        query = self._apply_filters(
            query, search, attack_type, blocked_only, 
            is_attack_only, status_code, start_date, end_date
        )
        return query.order_by(desc(WafLog.timestamp)).offset(skip).limit(limit).all()

    def get_log_count(self, search: str, attack_type: str, blocked_only: bool,
                      is_attack_only: bool = False, status_code: Optional[int] = None,
                      start_date: Optional[str] = None, end_date: Optional[str] = None) -> int:
        query = self.db_session.query(func.count(WafLog.id))
        query = self._apply_filters(
            query, search, attack_type, blocked_only, 
            is_attack_only, status_code, start_date, end_date
        )
        return query.scalar()

    def get_stats(self) -> Dict[str, Any]:
        total_requests = self.db_session.query(func.count(WafLog.id)).scalar()
        blocked_requests = self.db_session.query(func.count(WafLog.id)).filter(WafLog.is_blocked == True).scalar()
        
        # This is a simplified way to get top attacks. For better performance on large datasets,
        # a different approach might be needed (e.g., pre-aggregation or more complex queries).
        attack_types_query = self.db_session.query(func.json_unquote(func.json_extract(WafLog.attack_types, '$[0]'))).filter(func.json_length(WafLog.attack_types) > 0).all()
        
        attack_counts = {}
        for at in attack_types_query:
            attack_counts[at[0]] = attack_counts.get(at[0], 0) + 1

        return {
            "total_requests": total_requests,
            "blocked_requests": blocked_requests,
            "top_attacks": [{"type": k, "count": v} for k, v in sorted(attack_counts.items(), key=lambda item: item[1], reverse=True)[:5]]
        }
