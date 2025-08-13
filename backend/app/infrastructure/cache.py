# Simple in-memory cache for dashboard stats
from typing import Any, Optional, Dict
from datetime import datetime, timedelta
import asyncio
import json

class CacheManager:
    """Simple cache manager for storing temporary data"""
    
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()
    
    async def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        async with self._lock:
            if key in self._cache:
                entry = self._cache[key]
                if entry["expires_at"] > datetime.utcnow():
                    return entry["value"]
                else:
                    # Remove expired entry
                    del self._cache[key]
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        """Set value in cache with TTL in seconds"""
        async with self._lock:
            expires_at = datetime.utcnow() + timedelta(seconds=ttl)
            self._cache[key] = {
                "value": value,
                "expires_at": expires_at
            }
    
    async def delete(self, key: str) -> None:
        """Delete key from cache"""
        async with self._lock:
            if key in self._cache:
                del self._cache[key]
    
    async def clear(self) -> None:
        """Clear all cache entries"""
        async with self._lock:
            self._cache.clear()
    
    async def cleanup_expired(self) -> None:
        """Remove expired entries"""
        async with self._lock:
            now = datetime.utcnow()
            expired_keys = [
                key for key, entry in self._cache.items()
                if entry["expires_at"] <= now
            ]
            for key in expired_keys:
                del self._cache[key]

# Global cache instance
cache_manager = CacheManager()

# Background task to clean up expired entries every minute
async def cache_cleanup_task():
    """Run periodic cache cleanup"""
    while True:
        await asyncio.sleep(60)
        await cache_manager.cleanup_expired()