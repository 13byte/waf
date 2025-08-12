from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class WafLogRepository(ABC):
    @abstractmethod
    def get_logs(self, skip: int, limit: int, search: str, attack_type: str, 
                 blocked_only: bool, is_attack_only: bool = False, 
                 status_code: Optional[int] = None, start_date: Optional[str] = None, 
                 end_date: Optional[str] = None) -> List[Dict[str, Any]]:
        raise NotImplementedError
    
    @abstractmethod
    def get_log_count(self, search: str, attack_type: str, blocked_only: bool,
                      is_attack_only: bool = False, status_code: Optional[int] = None,
                      start_date: Optional[str] = None, end_date: Optional[str] = None) -> int:
        raise NotImplementedError

    @abstractmethod
    def get_stats(self) -> Dict[str, Any]:
        raise NotImplementedError
