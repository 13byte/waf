from app.domain.repositories.waf_log_repository import WafLogRepository

class MonitoringService:
    def __init__(self, waf_log_repo: WafLogRepository):
        self.waf_log_repo = waf_log_repo

    def get_logs(self, skip: int, limit: int, search: str, attack_type: str, blocked_only: bool):
        logs = self.waf_log_repo.get_logs(skip, limit, search, attack_type, blocked_only)
        total = self.waf_log_repo.get_log_count(search, attack_type, blocked_only)
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
