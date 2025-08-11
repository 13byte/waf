from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional, List, Dict, Any
import json
import os
import re
from datetime import datetime
from collections import defaultdict, Counter
import hashlib

router = APIRouter()

WAF_LOG_PATH = "/var/log/modsecurity/audit.log"
FALLBACK_LOG_PATH = "./logs/modsecurity/audit.log"

def get_log_file_path():
    """실제 로그 파일 경로 또는 로컬 테스트 경로 반환"""
    if os.path.exists(WAF_LOG_PATH):
        return WAF_LOG_PATH
    elif os.path.exists(FALLBACK_LOG_PATH):
        return FALLBACK_LOG_PATH
    else:
        return None

def parse_modsecurity_log_line(line: str) -> Optional[Dict[str, Any]]:
    """ModSecurity JSON 로그 라인 파싱"""
    try:
        if not line.strip():
            return None
        
        # JSON 로그 파싱
        log_data = json.loads(line.strip())
        
        if "transaction" not in log_data:
            return None
            
        transaction = log_data["transaction"]
        messages = log_data.get("messages", [])
        response = log_data.get("response", {})
        
        # 고유 ID 생성
        log_id = hashlib.md5(
            f"{transaction.get('unique_id', '')}{transaction.get('time_stamp', '')}".encode()
        ).hexdigest()[:12]
        
        # 시간 파싱
        timestamp_str = transaction.get("time_stamp", "")
        try:
            # "Mon Aug 11 07:11:32 2025" 형식 파싱
            timestamp = datetime.strptime(timestamp_str, "%a %b %d %H:%M:%S %Y")
        except:
            timestamp = datetime.now()
            
        # 공격 타입 추출
        attack_types = []
        rule_ids = []
        primary_attack = "Unknown"
        primary_rule_id = "N/A"
        severity = 0
        
        for message in messages:
            if "details" in message:
                details = message["details"]
                tags = details.get("tags", [])
                rule_id = details.get("ruleId", "")
                file_path = details.get("file", "")
                
                # 공격 타입 식별
                for tag in tags:
                    if "attack-" in tag:
                        attack_type = tag.replace("attack-", "").upper()
                        if attack_type not in attack_types:
                            attack_types.append(attack_type)
                            
                # 주요 공격 타입 결정
                if "attack-xss" in tags and primary_attack == "Unknown":
                    primary_attack = "XSS Attack"
                elif "attack-sqli" in tags and primary_attack == "Unknown":
                    primary_attack = "SQL Injection"
                elif "attack-rce" in tags and primary_attack == "Unknown":
                    primary_attack = "Remote Code Execution"
                elif "attack-lfi" in tags and primary_attack == "Unknown":
                    primary_attack = "Local File Inclusion"
                    
                if rule_id and rule_id not in rule_ids:
                    rule_ids.append(rule_id)
                    if primary_rule_id == "N/A":
                        primary_rule_id = f"{rule_id} ({os.path.basename(file_path)})"
                        
                # 심각도 추출
                msg_severity = details.get("severity", 0)
                if isinstance(msg_severity, str):
                    try:
                        msg_severity = int(msg_severity)
                    except:
                        msg_severity = 0
                severity = max(severity, msg_severity)
        
        # 차단 여부 판단
        response_code = response.get("http_code", 200)
        is_blocked = response_code in [403, 406, 429, 501, 502, 503]
        
        # URI 및 메서드 추출
        request = transaction.get("request", {})
        method = request.get("method", "GET")
        uri = request.get("uri", "/")
        user_agent = request.get("headers", {}).get("User-Agent", "Unknown")
        
        return {
            "id": log_id,
            "timestamp": timestamp.isoformat(),
            "client_ip": transaction.get("client_ip", "0.0.0.0"),
            "client_port": transaction.get("client_port", 0),
            "host_ip": transaction.get("host_ip", "0.0.0.0"),
            "host_port": transaction.get("host_port", 80),
            "method": method,
            "uri": uri,
            "primary_attack": primary_attack,
            "primary_rule_id": primary_rule_id,
            "attack_types": attack_types,
            "rule_ids": rule_ids,
            "severity": severity,
            "is_blocked": is_blocked,
            "response_code": response_code,
            "user_agent": user_agent,
            "total_messages": len(messages),
            "raw_data": log_data
        }
        
    except json.JSONDecodeError:
        return None
    except Exception as e:
        print(f"Error parsing log line: {e}")
        return None

def read_waf_logs(limit: int = 100, offset: int = 0) -> List[Dict[str, Any]]:
    """WAF 로그 파일 읽기 및 파싱"""
    log_path = get_log_file_path()
    if not log_path:
        return []
        
    try:
        with open(log_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        # 최신 로그부터 처리 (역순)
        lines = lines[::-1]
        
        parsed_logs = []
        for line in lines:
            if len(parsed_logs) >= offset + limit:
                break
                
            parsed_log = parse_modsecurity_log_line(line)
            if parsed_log:
                parsed_logs.append(parsed_log)
                
        # offset 적용하여 슬라이싱
        return parsed_logs[offset:offset + limit]
        
    except Exception as e:
        print(f"Error reading log file: {e}")
        return []

def get_waf_statistics() -> Dict[str, Any]:
    """WAF 통계 생성"""
    log_path = get_log_file_path()
    if not log_path:
        return {
            "total_requests": 0,
            "blocked_requests": 0,
            "block_rate": 0.0,
            "top_attacks": [],
            "top_ips": [],
            "top_rules": []
        }
        
    try:
        with open(log_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            
        total_requests = 0
        blocked_requests = 0
        attack_counter = Counter()
        ip_counter = Counter()
        rule_counter = Counter()
        
        for line in lines:
            parsed_log = parse_modsecurity_log_line(line)
            if parsed_log:
                total_requests += 1
                
                if parsed_log["is_blocked"]:
                    blocked_requests += 1
                    
                # 공격 타입 카운트
                for attack_type in parsed_log["attack_types"]:
                    attack_counter[attack_type] += 1
                    
                # IP 카운트
                ip_counter[parsed_log["client_ip"]] += 1
                
                # 룰 카운트
                for rule_id in parsed_log["rule_ids"]:
                    rule_counter[rule_id] += 1
        
        block_rate = (blocked_requests / total_requests * 100) if total_requests > 0 else 0.0
        
        return {
            "total_requests": total_requests,
            "blocked_requests": blocked_requests,
            "block_rate": round(block_rate, 2),
            "top_attacks": [{"type": k, "count": v} for k, v in attack_counter.most_common(10)],
            "top_ips": [{"ip": k, "count": v} for k, v in ip_counter.most_common(10)],
            "top_rules": [{"rule_id": k, "count": v} for k, v in rule_counter.most_common(10)]
        }
        
    except Exception as e:
        print(f"Error generating statistics: {e}")
        return {
            "total_requests": 0,
            "blocked_requests": 0,
            "block_rate": 0.0,
            "top_attacks": [],
            "top_ips": [],
            "top_rules": []
        }

@router.get("/waf/logs")
async def get_waf_logs(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None),
    attack_type: Optional[str] = Query(None),
    blocked_only: Optional[bool] = Query(None),
    ip_filter: Optional[str] = Query(None),
    rule_id_filter: Optional[str] = Query(None)
):
    """WAF 로그 조회 API"""
    try:
        # 전체 로그 읽기 (필터링을 위해)
        all_logs = read_waf_logs(limit=1000, offset=0)
        
        # 필터링 적용
        filtered_logs = []
        for log in all_logs:
            # 검색 필터
            if search:
                search_text = f"{log['uri']} {log['primary_attack']} {log['client_ip']} {log['user_agent']}"
                if search.lower() not in search_text.lower():
                    continue
                    
            # 공격 타입 필터
            if attack_type and attack_type not in log['attack_types']:
                continue
                
            # 차단 상태 필터
            if blocked_only is not None and log['is_blocked'] != blocked_only:
                continue
                
            # IP 필터
            if ip_filter and ip_filter not in log['client_ip']:
                continue
                
            # 룰 ID 필터
            if rule_id_filter and not any(rule_id_filter in rule_id for rule_id in log['rule_ids']):
                continue
                
            filtered_logs.append(log)
        
        # 페이지네이션 적용
        total_filtered = len(filtered_logs)
        paginated_logs = filtered_logs[offset:offset + limit]
        has_more = offset + limit < total_filtered
        
        return {
            "logs": paginated_logs,
            "total": total_filtered,
            "has_more": has_more,
            "offset": offset,
            "limit": limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve WAF logs: {str(e)}")

@router.get("/waf/stats")
async def get_waf_stats():
    """WAF 통계 조회 API"""
    try:
        stats = get_waf_statistics()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve WAF statistics: {str(e)}")

@router.get("/waf/logs/{log_id}")
async def get_waf_log_detail(log_id: str):
    """특정 WAF 로그 상세 조회"""
    try:
        logs = read_waf_logs(limit=1000, offset=0)
        
        for log in logs:
            if log["id"] == log_id:
                return log
                
        raise HTTPException(status_code=404, detail="Log not found")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve log detail: {str(e)}")
