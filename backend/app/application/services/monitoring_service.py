from typing import Optional
from app.domain.repositories.waf_log_repository import WafLogRepository

class MonitoringService:
    def __init__(self, waf_log_repo: WafLogRepository):
        self.waf_log_repo = waf_log_repo

    def get_logs(self, skip: int, limit: int, search: str, attack_type: str, 
                 blocked_only: bool, is_attack_only: bool = False, 
                 status_code: Optional[int] = None, start_date: Optional[str] = None, 
                 end_date: Optional[str] = None):
        logs = self.waf_log_repo.get_logs(
            skip, limit, search, attack_type, blocked_only, 
            is_attack_only, status_code, start_date, end_date
        )
        total = self.waf_log_repo.get_log_count(
            search, attack_type, blocked_only, 
            is_attack_only, status_code, start_date, end_date
        )
        return {
            "logs": logs,
            "total": total,
            "has_more": skip + limit < total
        }

    def get_stats(self):
        stats = self.waf_log_repo.get_stats()
        block_rate = (stats["blocked_requests"] / stats["total_requests"] * 100) if stats["total_requests"] > 0 else 0
        stats["block_rate"] = round(block_rate, 1)
        return stats
