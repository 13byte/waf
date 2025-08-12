from fastapi import APIRouter, Depends, Query
from datetime import datetime
from typing import Optional
from app.application.services.monitoring_service import MonitoringService
from app.presentation.dependencies import get_monitoring_service

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])

@router.get("/logs")
def get_waf_logs(
    skip: int = Query(0, ge=0), 
    limit: int = Query(100, ge=1, le=1000), 
    search: str = Query("", description="Search by IP or URI"), 
    attack_type: str = Query("", description="Filter by attack type"), 
    blocked_only: bool = Query(False, description="Show only blocked requests"),
    is_attack_only: bool = Query(False, description="Show only attacks"),
    status_code: Optional[int] = Query(None, description="Filter by HTTP status code"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    monitoring_service: MonitoringService = Depends(get_monitoring_service)
):
    return monitoring_service.get_logs(
        skip, limit, search, attack_type, blocked_only, 
        is_attack_only, status_code, start_date, end_date
    )

@router.get("/stats")
def get_waf_stats(monitoring_service: MonitoringService = Depends(get_monitoring_service)):
    return monitoring_service.get_stats()