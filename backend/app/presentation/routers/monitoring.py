from fastapi import APIRouter, Depends, Query
from app.application.services.monitoring_service import MonitoringService
from app.presentation.dependencies import get_monitoring_service

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])

@router.get("/logs")
def get_waf_logs(
    skip: int = 0, 
    limit: int = 100, 
    search: str = "", 
    attack_type: str = "", 
    blocked_only: bool = False,
    monitoring_service: MonitoringService = Depends(get_monitoring_service)
):
    return monitoring_service.get_logs(skip, limit, search, attack_type, blocked_only)

@router.get("/stats")
def get_waf_stats(monitoring_service: MonitoringService = Depends(get_monitoring_service)):
    return monitoring_service.get_stats()