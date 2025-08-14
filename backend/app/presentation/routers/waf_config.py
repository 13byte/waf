# WAF configuration API endpoints
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ...infrastructure.timezone import get_kst_now

from ...infrastructure.database import get_db
from ...domain.models.waf_config import WafConfig, CustomRule
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/waf/config", tags=["WAF Configuration"])

@router.get("")
async def get_waf_config(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get current WAF configuration"""
    config = db.query(WafConfig).filter(WafConfig.config_name == "default").first()
    
    if not config:
        # Create default config
        config = WafConfig(
            config_name="default",
            paranoia_level=1,
            rule_engine=True,
            audit_engine=True,
            anomaly_threshold=5,
            blocked_ips=[],
            allowed_ips=[],
            custom_rules=[],
            updated_by=current_user.username
        )
        db.add(config)
        db.commit()
        db.refresh(config)
    
    return {
        "id": str(config.id),
        "paranoia_level": config.paranoia_level,
        "rule_engine": config.rule_engine,
        "audit_engine": config.audit_engine,
        "anomaly_threshold": config.anomaly_threshold,
        "blocked_ips": config.blocked_ips or [],
        "allowed_ips": config.allowed_ips or [],
        "custom_rules": config.custom_rules or [],
        "updated_at": config.updated_at.isoformat(),
        "updated_by": config.updated_by
    }

@router.put("")
async def update_waf_config(
    paranoia_level: Optional[int] = Body(None, ge=1, le=4),
    rule_engine: Optional[bool] = Body(None),
    audit_engine: Optional[bool] = Body(None),
    anomaly_threshold: Optional[int] = Body(None, ge=0),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update WAF configuration"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config = db.query(WafConfig).filter(WafConfig.config_name == "default").first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    if paranoia_level is not None:
        config.paranoia_level = paranoia_level
    if rule_engine is not None:
        config.rule_engine = rule_engine
    if audit_engine is not None:
        config.audit_engine = audit_engine
    if anomaly_threshold is not None:
        config.anomaly_threshold = anomaly_threshold
    
    config.updated_at = get_kst_now()
    config.updated_by = current_user.username
    
    db.commit()
    db.refresh(config)
    
    return {
        "id": str(config.id),
        "paranoia_level": config.paranoia_level,
        "rule_engine": config.rule_engine,
        "audit_engine": config.audit_engine,
        "anomaly_threshold": config.anomaly_threshold,
        "updated_at": config.updated_at.isoformat(),
        "updated_by": config.updated_by
    }

@router.post("/blocked-ips")
async def add_blocked_ip(
    ip: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Add IP to block list"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config = db.query(WafConfig).filter(WafConfig.config_name == "default").first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    blocked_ips = config.blocked_ips or []
    if ip not in blocked_ips:
        blocked_ips.append(ip)
        config.blocked_ips = blocked_ips
        config.updated_at = get_kst_now()
        config.updated_by = current_user.username
        db.commit()
    
    return {"message": f"IP {ip} added to block list"}

@router.delete("/blocked-ips/{ip}")
async def remove_blocked_ip(
    ip: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Remove IP from block list"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config = db.query(WafConfig).filter(WafConfig.config_name == "default").first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    blocked_ips = config.blocked_ips or []
    if ip in blocked_ips:
        blocked_ips.remove(ip)
        config.blocked_ips = blocked_ips
        config.updated_at = get_kst_now()
        config.updated_by = current_user.username
        db.commit()
    
    return {"message": f"IP {ip} removed from block list"}

@router.post("/rules")
async def add_custom_rule(
    name: str = Body(...),
    pattern: str = Body(...),
    action: str = Body(..., regex="^(block|allow|log|redirect)$"),
    priority: int = Body(100),
    enabled: bool = Body(True),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Add custom WAF rule"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    rule = CustomRule(
        name=name,
        pattern=pattern,
        action=action,
        priority=priority,
        enabled=enabled,
        created_by=current_user.username
    )
    
    db.add(rule)
    db.commit()
    db.refresh(rule)
    
    return {
        "id": rule.id,
        "name": rule.name,
        "pattern": rule.pattern,
        "action": rule.action,
        "priority": rule.priority,
        "enabled": rule.enabled
    }

@router.get("/rules")
async def get_custom_rules(
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all custom rules"""
    rules = db.query(CustomRule).order_by(CustomRule.priority).all()
    
    return {
        "rules": [
            {
                "id": r.id,
                "name": r.name,
                "pattern": r.pattern,
                "action": r.action,
                "priority": r.priority,
                "enabled": r.enabled,
                "created_at": r.created_at.isoformat(),
                "created_by": r.created_by
            }
            for r in rules
        ]
    }

@router.delete("/rules/{rule_id}")
async def delete_custom_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete custom rule"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    rule = db.query(CustomRule).filter(CustomRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    db.delete(rule)
    db.commit()
    
    return {"message": f"Rule {rule.name} deleted"}