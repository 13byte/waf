"""Timezone utilities for KST (Korea Standard Time) handling"""
from datetime import datetime, timezone, timedelta
from typing import Optional

# Korea Standard Time (UTC+9)
KST = timezone(timedelta(hours=9))

def get_kst_now() -> datetime:
    """Get current time in KST timezone"""
    return datetime.now(KST)

def get_kst_time(dt: Optional[datetime] = None) -> datetime:
    """Convert UTC datetime to KST. If no datetime provided, return current KST time"""
    if dt is None:
        return get_kst_now()
    
    # If datetime is naive (no timezone), assume it's UTC
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    
    # Convert to KST
    return dt.astimezone(KST)

def to_utc(dt: datetime) -> datetime:
    """Convert KST datetime to UTC for database storage"""
    if dt.tzinfo is None:
        # Assume it's KST if no timezone info
        dt = dt.replace(tzinfo=KST)
    return dt.astimezone(timezone.utc)