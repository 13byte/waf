from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
import json
import os
import hashlib
from datetime import datetime
from pathlib import Path

router = APIRouter(prefix="/logs", tags=["logs"])

LOG_PATH = "/var/log/modsecurity/audit.log"
LOCAL_LOG_PATH = "./logs/modsecurity/audit.log"

def get_log_file_path() -> str:
    """Determine the correct log file path"""
    if os.path.exists(LOG_PATH):
        return LOG_PATH
    elif os.path.exists(LOCAL_LOG_PATH):
        return LOCAL_LOG_PATH
    else:
        # Try relative to project root
        project_root = Path(__file__).parent.parent.parent.parent
        fallback_path = project_root / "logs" / "modsecurity" / "audit.log"
        return str(fallback_path)

def parse_log_entry(line: str) -> Dict[str, Any]:
    """Parse a single JSON log entry"""
    try:
        data = json.loads(line.strip())
        transaction = data.get("transaction", {})
        messages = data.get("messages", [])
        response = data.get("response", {})
        
        # Extract primary attack information
        primary_attack = "Unknown"
        primary_rule_id = "N/A"
        severity = 0
        
        # Parse attack information from messages
        attack_types = []
        rule_ids = []
        file_names = []
        
        for msg in messages:
            details = msg.get("details", {})
            tags = details.get("tags", [])
            rule_id = details.get("ruleId", "")
            file_path = details.get("file", "")
            
            # Extract attack types from tags
            for tag in tags:
                if "attack-" in tag:
                    attack_type = tag.replace("attack-", "").upper()
                    if attack_type not in attack_types:
                        attack_types.append(attack_type)
            
            # Set primary attack based on priority
            if "attack-xss" in tags and primary_attack == "Unknown":
                primary_attack = "XSS Attack"
            elif "attack-sqli" in tags and primary_attack == "Unknown":
                primary_attack = "SQL Injection"
            elif "attack-rce" in tags and primary_attack == "Unknown":
                primary_attack = "Remote Code Execution"
            elif "attack-lfi" in tags and primary_attack == "Unknown":
                primary_attack = "Local File Inclusion"
            elif "attack-rfi" in tags and primary_attack == "Unknown":
                primary_attack = "Remote File Inclusion"
            elif primary_attack == "Unknown" and attack_types:
                primary_attack = f"{attack_types[0]} Attack"
            
            # Rule ID and file info
            if rule_id and rule_id not in rule_ids:
                rule_ids.append(rule_id)
                if primary_rule_id == "N/A":
                    file_name = os.path.basename(file_path) if file_path else ""
                    primary_rule_id = f"{rule_id} ({file_name})" if file_name else rule_id
            
            # Severity (use highest)
            msg_severity = details.get("severity", 0)
            if isinstance(msg_severity, str):
                try:
                    msg_severity = int(msg_severity)
                except:
                    msg_severity = 0
            severity = max(severity, msg_severity)
        
        # Determine block status - 403, 406, 429, 500+ are blocked
        response_code = response.get("http_code", 200)
        is_blocked = response_code in [403, 406, 429] or response_code >= 500
        
        # Parse timestamp
        timestamp_str = transaction.get("time_stamp", "")
        try:
            timestamp = datetime.strptime(timestamp_str, "%a %b %d %H:%M:%S %Y")
        except:
            timestamp = datetime.now()
        
        # Generate unique ID if not present
        unique_id = transaction.get("unique_id", "")
        if not unique_id:
            import hashlib
            unique_id = hashlib.md5(f"{timestamp_str}{transaction.get('client_ip', '')}".encode()).hexdigest()[:12]
        
        # Extract request info
        request = transaction.get("request", {})
        headers = request.get("headers", {})
        
        return {
            "id": unique_id,
            "timestamp": timestamp.isoformat(),
            "client_ip": transaction.get("client_ip", "0.0.0.0"),
            "client_port": transaction.get("client_port", 0),
            "host_ip": transaction.get("host_ip", "0.0.0.0"),
            "host_port": transaction.get("host_port", 80),
            "method": request.get("method", "GET"),
            "uri": request.get("uri", "/"),
            "primary_attack": primary_attack,
            "primary_rule_id": primary_rule_id,
            "attack_types": attack_types,
            "rule_ids": rule_ids,
            "severity": severity,
            "is_blocked": is_blocked,
            "response_code": response_code,
            "user_agent": headers.get("User-Agent", "Unknown"),
            "total_messages": len(messages),
            "raw_data": data
        }
    except Exception as e:
        return None

@router.get("/waf-logs")
async def get_waf_logs(
    limit: int = Query(50, le=500),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None),
    attack_type: Optional[str] = Query(None),
    blocked_only: Optional[bool] = Query(None),
    ip_filter: Optional[str] = Query(None),
    rule_id_filter: Optional[str] = Query(None)
):
    """Get WAF logs with filtering and pagination"""
    
    log_file_path = get_log_file_path()
    
    if not os.path.exists(log_file_path):
        return {
            "logs": [],
            "total": 0,
            "has_more": False,
            "error": f"Log file not found: {log_file_path}"
        }
    
    try:
        logs = []
        total_lines = 0
        
        with open(log_file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            total_lines = len(lines)
            
            # Parse logs in reverse order (newest first)
            for line in reversed(lines):
                if not line.strip():
                    continue
                    
                log_entry = parse_log_entry(line)
                if not log_entry:
                    continue
                
                # Apply filters
                if search and search.lower() not in log_entry["primary_attack"].lower() and \
                   search.lower() not in log_entry["uri"].lower():
                    continue
                
                if attack_type and attack_type.upper() not in log_entry["attack_types"]:
                    continue
                
                if blocked_only is not None and log_entry["is_blocked"] != blocked_only:
                    continue
                
                if ip_filter and ip_filter not in log_entry["client_ip"]:
                    continue
                
                if rule_id_filter and rule_id_filter not in log_entry["primary_rule_id"]:
                    continue
                
                logs.append(log_entry)
        
        # Apply pagination
        total_filtered = len(logs)
        paginated_logs = logs[offset:offset + limit]
        
        return {
            "logs": paginated_logs,
            "total": total_filtered,
            "total_lines": total_lines,
            "has_more": offset + limit < total_filtered,
            "offset": offset,
            "limit": limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading log file: {str(e)}")

@router.get("/waf-logs/{log_id}")
async def get_log_detail(log_id: str):
    """Get detailed information for a specific log entry"""
    
    log_file_path = get_log_file_path()
    
    if not os.path.exists(log_file_path):
        raise HTTPException(status_code=404, detail="Log file not found")
    
    try:
        with open(log_file_path, 'r', encoding='utf-8') as f:
            for line in f:
                if not line.strip():
                    continue
                
                log_entry = parse_log_entry(line)
                if log_entry and log_entry["id"] == log_id:
                    return log_entry
        
        raise HTTPException(status_code=404, detail="Log entry not found")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading log file: {str(e)}")

@router.get("/waf-stats")
async def get_waf_statistics():
    """Get WAF statistics summary"""
    
    log_file_path = get_log_file_path()
    
    if not os.path.exists(log_file_path):
        return {
            "total_requests": 0,
            "blocked_requests": 0,
            "top_attacks": [],
            "top_ips": [],
            "top_rules": [],
            "error": "Log file not found"
        }
    
    try:
        attack_counts = {}
        ip_counts = {}
        rule_counts = {}
        total_requests = 0
        blocked_requests = 0
        
        with open(log_file_path, 'r', encoding='utf-8') as f:
            for line in f:
                if not line.strip():
                    continue
                
                log_entry = parse_log_entry(line)
                if not log_entry:
                    continue
                
                total_requests += 1
                
                if log_entry["is_blocked"]:
                    blocked_requests += 1
                
                # Count attacks
                for attack_type in log_entry["attack_types"]:
                    attack_counts[attack_type] = attack_counts.get(attack_type, 0) + 1
                
                # Count IPs
                ip = log_entry["client_ip"]
                ip_counts[ip] = ip_counts.get(ip, 0) + 1
                
                # Count rules
                for rule_id in log_entry["rule_ids"]:
                    rule_counts[rule_id] = rule_counts.get(rule_id, 0) + 1
        
        # Get top items
        top_attacks = sorted(attack_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        top_ips = sorted(ip_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        top_rules = sorted(rule_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        
        return {
            "total_requests": total_requests,
            "blocked_requests": blocked_requests,
            "block_rate": round((blocked_requests / max(total_requests, 1)) * 100, 2),
            "top_attacks": [{"type": k, "count": v} for k, v in top_attacks],
            "top_ips": [{"ip": k, "count": v} for k, v in top_ips],
            "top_rules": [{"rule_id": k, "count": v} for k, v in top_rules]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing log file: {str(e)}")
