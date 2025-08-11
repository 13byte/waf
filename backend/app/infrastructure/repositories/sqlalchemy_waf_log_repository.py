from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.domain.models.models import WafLog
from app.domain.repositories.waf_log_repository import WafLogRepository

class SQLAlchemyWafLogRepository(WafLogRepository):
    def __init__(self, db_session: Session):
        self.db_session = db_session

    def get_logs(self, skip: int, limit: int, search: str, attack_type: str, blocked_only: bool) -> List[WafLog]:
        query = self.db_session.query(WafLog)
        if search:
            search_term = f"%{search}%"
            query = query.filter(WafLog.uri.like(search_term) | WafLog.client_ip.like(search_term))
        if attack_type:
            query = query.filter(func.json_contains(WafLog.attack_types, f'"{attack_type}"'))
        if blocked_only:
            query = query.filter(WafLog.is_blocked == True)
        
        return query.order_by(desc(WafLog.timestamp)).offset(skip).limit(limit).all()

    def get_log_count(self, search: str, attack_type: str, blocked_only: bool) -> int:
        query = self.db_session.query(func.count(WafLog.id))
        if search:
            search_term = f"%{search}%"
            query = query.filter(WafLog.uri.like(search_term) | WafLog.client_ip.like(search_term))
        if attack_type:
            query = query.filter(func.json_contains(WafLog.attack_types, f'"{attack_type}"'))
        if blocked_only:
            query = query.filter(WafLog.is_blocked == True)
            
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
