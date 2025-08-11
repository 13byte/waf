from abc import ABC, abstractmethod
from typing import List, Dict, Any

class WafLogRepository(ABC):
    @abstractmethod
    def get_logs(self, skip: int, limit: int, search: str, attack_type: str, blocked_only: bool) -> List[Dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    def get_stats(self) -> Dict[str, Any]:
        raise NotImplementedError
