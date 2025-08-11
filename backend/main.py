from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from app.config import settings
from app.routers import auth, posts, logs
import os
import subprocess
import uuid
import mimetypes
import json
from datetime import datetime
from typing import List, Dict, Any

app = FastAPI(
    title="WAF Test API",
    description="API for ModSecurity WAF Testing",
    version=settings.api_version,
    debug=settings.debug
)

@app.middleware("http")
async def error_page_middleware(request: Request, call_next):
    original_uri = request.headers.get("x-original-uri")
    
    if original_uri:
        if original_uri == "/error/403":
            return JSONResponse(
                status_code=403,
                content={
                    "error": "Forbidden", 
                    "message": "WAF blocked this request",
                    "status_code": 403,
                    "blocked_by": "ModSecurity WAF"
                }
            )
        elif original_uri == "/error/404":
            return JSONResponse(
                status_code=404,
                content={
                    "error": "Not Found",
                    "message": "The requested resource was not found",
                    "status_code": 404
                }
            )
        elif original_uri == "/error/500":
            return JSONResponse(
                status_code=500,
                content={
                    "error": "Internal Server Error",
                    "message": "An internal server error occurred",
                    "status_code": 500
                }
            )
    
    response = await call_next(request)
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

app.include_router(auth.router, prefix="/api")
app.include_router(posts.router, prefix="/api")
app.include_router(logs.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "WAF Test API", "version": settings.api_version}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/api/vulnerable/xss")
def vulnerable_xss_endpoint(input_data: str):
    return {"result": f"<div>User input: {input_data}</div>", "raw_input": input_data}

@app.get("/api/vulnerable/sqli")
def vulnerable_sql_injection(user_id: str):
    from app.database import engine
    from sqlalchemy import text
    
    try:
        with engine.connect() as connection:
            query = text(f"SELECT * FROM users WHERE id = {user_id}")
            result = connection.execute(query)
            return {"query": str(query), "result": "Query executed"}
    except Exception as e:
        return {"error": str(e), "query": f"SELECT * FROM users WHERE id = {user_id}"}

@app.get("/api/vulnerable/path-traversal")
def vulnerable_path_traversal(file_path: str):
    try:
        full_path = os.path.join(settings.upload_dir, file_path)
        with open(full_path, 'r') as f:
            content = f.read()
        return {"file_path": full_path, "content": content}
    except Exception as e:
        return {"error": str(e), "attempted_path": file_path}

@app.get("/api/vulnerable/command-injection")
def vulnerable_command_injection(command: str, execution_type: str = "shell"):
    execution_methods = {
        "shell": lambda cmd: subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=10),
        "direct": lambda cmd: subprocess.run(cmd.split(), capture_output=True, text=True, timeout=10),
        "eval": lambda cmd: eval(f"subprocess.run('{cmd}', shell=True, capture_output=True, text=True, timeout=10)"),
        "os_system": lambda cmd: {"returncode": os.system(cmd), "stdout": "Command executed via os.system", "stderr": ""}
    }
    
    try:
        if execution_type in execution_methods:
            result = execution_methods[execution_type](command)
            return {
                "command": command,
                "execution_type": execution_type,
                "stdout": getattr(result, 'stdout', result.get('stdout', '')),
                "stderr": getattr(result, 'stderr', result.get('stderr', '')),
                "return_code": getattr(result, 'returncode', result.get('returncode', 0)),
                "crs_rule_triggered": "932xxx - Remote Command Execution"
            }
        else:
            return {"error": "Invalid execution type", "available_types": list(execution_methods.keys())}
    except subprocess.TimeoutExpired:
        return {"error": "Command timeout", "command": command, "execution_type": execution_type}
    except Exception as e:
        return {"error": str(e), "command": command, "execution_type": execution_type}

@app.get("/api/vulnerable/user-agent")
def vulnerable_user_agent_bypass(request: Request, access_level: str = "auto"):
    user_agent = request.headers.get("user-agent", "No User-Agent")
    
    # User-Agent 기반 권한 우회 시나리오
    privilege_patterns = {
        "admin": ["admin", "administrator", "root", "superuser"],
        "bot": ["googlebot", "bingbot", "slurp", "crawler", "spider"],
        "browser": ["mozilla", "chrome", "firefox", "safari", "edge"],
        "mobile": ["android", "iphone", "mobile", "tablet"]
    }
    
    detected_privileges = []
    for privilege, patterns in privilege_patterns.items():
        if any(pattern in user_agent.lower() for pattern in patterns):
            detected_privileges.append(privilege)
    
    # 권한 우회 로직 (의도적 취약점)
    if "admin" in detected_privileges or "admin" in access_level.lower():
        return {
            "user_agent": user_agent,
            "access_level": "administrator",
            "privileges": ["read", "write", "delete", "admin"],
            "sensitive_data": {
                "api_keys": ["key_12345", "secret_67890"],
                "internal_endpoints": ["/admin/users", "/admin/config"],
                "database_info": "mysql://localhost:3306/waf_test_db"
            },
            "bypass_successful": True,
            "crs_rule_triggered": "920xxx - Protocol Violations"
        }
    elif "bot" in detected_privileges:
        return {
            "user_agent": user_agent,
            "access_level": "bot",
            "privileges": ["read", "index"],
            "rate_limit": "bypassed",
            "robots_txt": "ignored",
            "bypass_successful": True,
            "crs_rule_triggered": "921xxx - Application Attacks"
        }
    else:
        return {
            "user_agent": user_agent,
            "access_level": "guest",
            "privileges": ["read"],
            "detected_privileges": detected_privileges,
            "bypass_successful": False
        }

@app.get("/api/vulnerable/header-manipulation")
def vulnerable_header_manipulation(request: Request, bypass_mode: str = "auto"):
    headers = dict(request.headers)
    
    # 권한 승격 헤더 패턴
    privilege_headers = {
        "x-admin-access": "admin",
        "x-privilege-escalation": "admin", 
        "x-bypass-auth": "admin",
        "x-internal-access": "internal",
        "x-debug-mode": "debug"
    }
    
    # IP 스푸핑 헤더
    ip_headers = ["x-forwarded-for", "x-real-ip", "x-originating-ip", "cf-connecting-ip"]
    
    # 인증 우회 헤더
    auth_headers = ["authorization", "x-api-key", "x-token", "x-auth-token"]
    
    detected_privileges = []
    detected_ips = []
    auth_bypass_attempts = []
    
    # 권한 헤더 검사
    for header, privilege in privilege_headers.items():
        if header in headers:
            detected_privileges.append({"header": header, "privilege": privilege, "value": headers[header]})
    
    # IP 스푸핑 검사
    for ip_header in ip_headers:
        if ip_header in headers:
            detected_ips.append({"header": ip_header, "spoofed_ip": headers[ip_header]})
    
    # 인증 우회 검사
    for auth_header in auth_headers:
        if auth_header in headers:
            auth_bypass_attempts.append({"header": auth_header, "value": headers[auth_header][:20] + "..."})
    
    # 취약한 처리 로직 (의도적)
    admin_access = any(priv["privilege"] == "admin" for priv in detected_privileges)
    ip_spoofed = len(detected_ips) > 0
    auth_bypassed = len(auth_bypass_attempts) > 0
    
    response_data = {
        "all_headers": headers,
        "detected_privileges": detected_privileges,
        "detected_ip_spoofing": detected_ips,
        "auth_bypass_attempts": auth_bypass_attempts,
        "admin_access_granted": admin_access,
        "ip_spoofing_detected": ip_spoofed,
        "auth_bypass_detected": auth_bypassed
    }
    
    # Sensitive data exposure based on privilege
    if admin_access:
        response_data.update({
            "sensitive_admin_data": {
                "internal_config": {"db_password": "hidden_pass123", "api_secret": "secret_key_456"},
                "user_data": {"total_users": 1247, "admin_users": 3},
                "system_info": {"version": "1.0.0", "environment": "production"}
            },
            "crs_rule_triggered": "920xxx - Protocol Violations (Admin Headers)"
        })
    
    if ip_spoofed:
        response_data.update({
            "ip_spoofing_response": {
                "original_ip": "192.168.1.100",
                "spoofed_ips": [ip["spoofed_ip"] for ip in detected_ips],
                "geolocation_bypass": "successful"
            },
            "crs_rule_triggered": "921xxx - Application Attacks (IP Spoofing)"
        })
    
    return response_data

@app.post("/api/vulnerable/file-upload")
async def vulnerable_file_upload(
    file: UploadFile = File(...),
    upload_path: str = "",
    bypass_validation: str = "false",
    custom_extension: str = ""
):
    try:
        os.makedirs(settings.upload_dir, exist_ok=True)
        
        original_filename = file.filename or "unknown"
        file_extension = os.path.splitext(original_filename)[1].lower()
        
        if upload_path:
            target_dir = os.path.join(settings.upload_dir, upload_path)
            os.makedirs(target_dir, exist_ok=True)
        else:
            target_dir = settings.upload_dir
            
        if custom_extension:
            final_filename = f"{os.path.splitext(original_filename)[0]}{custom_extension}"
        else:
            final_filename = original_filename
            
        dangerous_extensions = [".exe", ".bat", ".sh", ".php", ".asp", ".jsp", ".cmd"]
        is_dangerous = any(final_filename.lower().endswith(ext) for ext in dangerous_extensions)
        
        if bypass_validation.lower() != "true":
            allowed_extensions = settings.allowed_extensions_list
            file_ext_check = file_extension.lstrip('.')
            
            if file_ext_check not in allowed_extensions and not custom_extension:
                return {
                    "error": "File type not allowed",
                    "allowed_extensions": allowed_extensions,
                    "bypass_hint": "Try using bypass_validation=true or custom_extension parameter",
                    "crs_rule_triggered": "920xxx - Protocol Violations (File Upload)"
                }
        
        unique_id = str(uuid.uuid4())[:8]
        safe_filename = f"{unique_id}_{final_filename}"
        file_path = os.path.join(target_dir, safe_filename)
        
        content = await file.read()
        file_size = len(content)
        
        if bypass_validation.lower() != "true" and file_size > settings.max_file_size:
            return {
                "error": f"File too large: {file_size} bytes (max: {settings.max_file_size})",
                "bypass_hint": "Try using bypass_validation=true parameter",
                "crs_rule_triggered": "921xxx - Application Attacks (File Size)"
            }
        
        mime_type = mimetypes.guess_type(original_filename)[0] or "application/octet-stream"
        content_type = file.content_type or "unknown"
        
        with open(file_path, "wb") as f:
            f.write(content)
        
        file_analysis = {
            "is_executable": is_dangerous,
            "has_script_content": any(keyword in content.decode('utf-8', errors='ignore').lower() 
                                    for keyword in ['script', 'eval', 'exec', '<?php', '<%']),
            "suspicious_headers": content[:100].startswith(b'MZ') or b'PK' in content[:10],
            "null_bytes": b'\x00' in content[:1024]
        }
        
        response_data = {
            "upload_successful": True,
            "original_filename": original_filename,
            "saved_filename": safe_filename,
            "file_path": file_path,
            "file_size": file_size,
            "mime_type": mime_type,
            "content_type": content_type,
            "target_directory": target_dir,
            "path_traversal_used": bool(upload_path),
            "validation_bypassed": bypass_validation.lower() == "true",
            "custom_extension_used": bool(custom_extension),
            "file_analysis": file_analysis,
            "security_warnings": []
        }
        
        if is_dangerous:
            response_data["security_warnings"].append("Executable file detected")
            response_data["crs_rule_triggered"] = "932xxx - Remote Command Execution (Executable Upload)"
            
        if file_analysis["has_script_content"]:
            response_data["security_warnings"].append("Script content detected")
            response_data["crs_rule_triggered"] = "941xxx - XSS Attacks (Script Upload)"
            
        if upload_path and (".." in upload_path or "/" in upload_path):
            response_data["security_warnings"].append("Path traversal attempt detected")
            response_data["crs_rule_triggered"] = "930xxx - Path Traversal (Directory Traversal)"
            
        return response_data
        
    except Exception as e:
        return {
            "error": f"Upload failed: {str(e)}",
            "upload_successful": False,
            "crs_rule_triggered": "921xxx - Application Attacks (Upload Error)"
        }

@app.get("/api/vulnerable/file-list")
def vulnerable_file_list(directory: str = ""):
    try:
        base_dir = settings.upload_dir
        
        if directory:
            target_dir = os.path.join(base_dir, directory)
        else:
            target_dir = base_dir
            
        if not os.path.exists(target_dir):
            return {
                "error": "Directory not found",
                "attempted_path": target_dir,
                "crs_rule_triggered": "930xxx - Path Traversal"
            }
            
        files = []
        for item in os.listdir(target_dir):
            item_path = os.path.join(target_dir, item)
            item_info = {
                "name": item,
                "is_directory": os.path.isdir(item_path),
                "size": os.path.getsize(item_path) if os.path.isfile(item_path) else 0,
                "path": item_path
            }
            files.append(item_info)
            
        return {
            "directory": target_dir,
            "files": files,
            "total_files": len(files),
            "directory_traversal_used": bool(directory),
            "crs_rule_triggered": "920xxx - Information Disclosure"
        }
        
    except Exception as e:
        return {
            "error": str(e),
            "attempted_directory": directory,
            "crs_rule_triggered": "930xxx - Path Traversal (Error)"
        }

@app.get("/api/vulnerable/file-download")
def vulnerable_file_download(file_path: str):
    try:
        if not file_path:
            return {"error": "File path required"}
            
        full_path = os.path.join(settings.upload_dir, file_path)
        
        if not os.path.exists(full_path):
            return {
                "error": "File not found",
                "attempted_path": full_path,
                "crs_rule_triggered": "930xxx - Path Traversal"
            }
            
        if os.path.isdir(full_path):
            return {
                "error": "Cannot download directory",
                "path": full_path,
                "crs_rule_triggered": "920xxx - Information Disclosure"
            }
            
        with open(full_path, 'rb') as f:
            content = f.read()
            
        file_info = {
            "file_path": full_path,
            "file_size": len(content),
            "content_preview": content[:200].decode('utf-8', errors='ignore'),
            "is_binary": not all(ord(char) < 128 for char in content[:100].decode('utf-8', errors='ignore')),
            "path_traversal_used": ".." in file_path,
            "crs_rule_triggered": "930xxx - Path Traversal (File Access)"
        }
        
        return file_info
        
    except Exception as e:
        return {
            "error": str(e),
            "attempted_path": file_path,
            "crs_rule_triggered": "930xxx - Path Traversal (Access Error)"
        }

def parse_audit_log():
    """Parse ModSecurity audit.log and return structured data with enhanced accuracy"""
    log_file_path = "/app/logs/modsecurity/audit.log"
    logs = []
    
    try:
        with open(log_file_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                    
                try:
                    log_entry = json.loads(line)
                    if 'transaction' not in log_entry:
                        continue
                        
                    transaction = log_entry.get("transaction", {})
                    request_data = transaction.get("request", {})
                    response_data = transaction.get("response", {})
                    
                    # Extract HTTP status code and messages
                    status_code = response_data.get("http_code", 0)
                    messages = log_entry.get("messages", [])
                    
                    # Determine if request was blocked: HTTP 403 AND messages present
                    is_blocked = status_code == 403 and len(messages) > 0
                    
                    # Initialize parsed log structure
                    parsed_log = {
                        "id": transaction.get("unique_id", ""),
                        "timestamp": transaction.get("time_stamp", ""),
                        "source_ip": transaction.get("client_ip", ""),
                        "source_port": transaction.get("client_port", 0),
                        "dest_ip": transaction.get("host_ip", ""),
                        "dest_port": transaction.get("host_port", 0),
                        "method": request_data.get("method", ""),
                        "uri": request_data.get("uri", ""),
                        "user_agent": request_data.get("headers", {}).get("User-Agent", "Unknown"),
                        "status_code": status_code,
                        "blocked": is_blocked,
                        "attack_types": [],
                        "rule_files": [],
                        "rule_ids": [],
                        "attack_details": [],
                        "severity_score": 0,
                        "messages": messages
                    }
                    
                    # Process messages for rule information
                    for message in log_entry.get("messages", []):
                        if "details" not in message:
                            continue
                            
                        details = message["details"]
                        
                        # Extract rule ID
                        rule_id = details.get("ruleId", "")
                        if rule_id and rule_id not in parsed_log["rule_ids"]:
                            parsed_log["rule_ids"].append(rule_id)
                        
                        # Extract and process file path
                        rule_file = details.get("file", "")
                        if rule_file:
                            file_name = rule_file.split("/")[-1]
                            if file_name and file_name not in parsed_log["rule_files"]:
                                parsed_log["rule_files"].append(file_name)
                        
                        # Extract attack types from tags - simplified CRS tag mapping
                        tags = details.get("tags", [])
                        for tag in tags:
                            if "attack-xss" in tag:
                                if "XSS" not in parsed_log["attack_types"]:
                                    parsed_log["attack_types"].append("XSS")
                            elif "attack-sqli" in tag:
                                if "SQLI" not in parsed_log["attack_types"]:
                                    parsed_log["attack_types"].append("SQLI")
                            elif "attack-lfi" in tag:
                                if "LFI" not in parsed_log["attack_types"]:
                                    parsed_log["attack_types"].append("LFI")
                            elif "attack-rfi" in tag:
                                if "RFI" not in parsed_log["attack_types"]:
                                    parsed_log["attack_types"].append("RFI")
                            elif "attack-rce" in tag:
                                if "RCE" not in parsed_log["attack_types"]:
                                    parsed_log["attack_types"].append("RCE")
                            elif "protocol" in tag.lower():
                                if "PROTOCOL" not in parsed_log["attack_types"]:
                                    parsed_log["attack_types"].append("PROTOCOL")
                        
                        # Fallback: extract from message content
                        message_text = message.get("message", "").upper()
                        if "XSS" in message_text and "XSS" not in parsed_log["attack_types"]:
                            parsed_log["attack_types"].append("XSS")
                        elif "SQL" in message_text and "SQLI" not in parsed_log["attack_types"]:
                            parsed_log["attack_types"].append("SQLI")
                        elif "TRAVERSAL" in message_text and "LFI" not in parsed_log["attack_types"]:
                            parsed_log["attack_types"].append("LFI")
                        
                        # Calculate severity score
                        severity = details.get("severity", "0")
                        try:
                            parsed_log["severity_score"] += int(severity)
                        except (ValueError, TypeError):
                            pass
                        
                        # Store detailed attack information
                        attack_data = details.get("data", "")
                        if attack_data or rule_id:
                            parsed_log["attack_details"].append({
                                "message": message.get("message", ""),
                                "data": attack_data,
                                "rule_id": rule_id,
                                "file": file_name,
                                "severity": severity,
                                "match": details.get("match", "")
                            })
                    
                    logs.append(parsed_log)
                        
                except json.JSONDecodeError:
                    continue
                except Exception as e:
                    print(f"Error parsing log entry: {e}")
                    continue
                    
    except FileNotFoundError:
        return {"error": "Audit log file not found", "logs": []}
    except Exception as e:
        return {"error": str(e), "logs": []}
    
    # Sort by timestamp (newest first)
    logs.sort(key=lambda x: x["timestamp"], reverse=True)
    return {"logs": logs, "total": len(logs)}

@app.get("/api/logs/waf-logs")
def get_waf_logs_legacy(skip: int = 0, limit: int = 100, search: str = "", attack_type: str = "", blocked_only: bool = False, ip_filter: str = "", rule_id_filter: str = ""):
    """Enhanced legacy endpoint with improved data transformation"""
    result = parse_audit_log()
    
    if "error" in result:
        return result
    
    logs = result["logs"]
    filtered_logs = []
    
    for log in logs:
        # Apply enhanced filters
        if search:
            search_lower = search.lower()
            search_match = (
                search_lower in log["source_ip"].lower() or 
                search_lower in log["uri"].lower() or
                search_lower in log.get("user_agent", "").lower() or
                any(search_lower in detail["data"].lower() for detail in log["attack_details"])
            )
            if not search_match:
                continue
        
        if attack_type and attack_type.upper() not in log["attack_types"]:
            continue
            
        if blocked_only and not log["blocked"]:
            continue

        if ip_filter and ip_filter not in log["source_ip"]:
            continue

        if rule_id_filter and rule_id_filter not in log["rule_ids"]:
            continue
            
        # Transform to expected format with normalized field names
        transformed_log = {
            "id": log["id"],
            "timestamp": log["timestamp"],
            "client_ip": log["source_ip"],
            "method": log["method"],
            "uri": log["uri"],
            "primary_attack": log["attack_types"][0] if log["attack_types"] else "Normal Request",
            "primary_rule_id": log["rule_ids"][0] if log["rule_ids"] else "N/A",
            "primary_file": log["rule_files"][0] if log["rule_files"] else "N/A",
            "attack_types": log["attack_types"],
            "rule_ids": log["rule_ids"],
            "rule_files": log["rule_files"],
            "severity": log.get("severity_score", 0),
            "is_blocked": log["blocked"],
            "response_code": log["status_code"],
            "user_agent": log.get("user_agent", "Unknown"),
            "total_messages": len(log["messages"]),
            "attack_details": log.get("attack_details", []),
            "raw_data": log["messages"]
        }
        filtered_logs.append(transformed_log)
    
    # Apply pagination
    total_filtered = len(filtered_logs)
    paginated_logs = filtered_logs[skip:skip + limit]
    
    return {
        "logs": paginated_logs,
        "total": total_filtered,
        "has_more": skip + limit < total_filtered
    }

@app.get("/api/logs/waf-stats")
def get_waf_stats_legacy():
    """Legacy stats endpoint for existing frontend compatibility"""
    result = parse_audit_log()
    
    if "error" in result:
        return result
    
    logs = result["logs"]
    
    total_requests = len(logs)
    blocked_requests = sum(1 for log in logs if log["blocked"])
    
    stats = {
        "total_requests": total_requests,
        "blocked_requests": blocked_requests,
        "block_rate": round((blocked_requests / total_requests * 100) if total_requests > 0 else 0, 1),
        "top_attacks": [],
        "top_ips": [],
        "top_rules": []
    }
    
    # Count attack types
    attack_counts = {}
    ip_counts = {}
    rule_counts = {}
    
    for log in logs:
        # Count attack types
        for attack_type in log["attack_types"]:
            attack_counts[attack_type] = attack_counts.get(attack_type, 0) + 1
        
        # Count source IPs
        ip_counts[log["source_ip"]] = ip_counts.get(log["source_ip"], 0) + 1
        
        # Count rule IDs
        for rule_id in log["rule_ids"]:
            rule_counts[rule_id] = rule_counts.get(rule_id, 0) + 1
    
    # Format top lists
    stats["top_attacks"] = [{"type": k, "count": v} for k, v in sorted(attack_counts.items(), key=lambda x: x[1], reverse=True)[:10]]
    stats["top_ips"] = [{"ip": k, "count": v} for k, v in sorted(ip_counts.items(), key=lambda x: x[1], reverse=True)[:10]]
    stats["top_rules"] = [{"rule_id": k, "count": v} for k, v in sorted(rule_counts.items(), key=lambda x: x[1], reverse=True)[:10]]
    
    return stats

@app.get("/api/monitoring/logs")
def get_waf_logs(skip: int = 0, limit: int = 100, search: str = "", attack_type: str = "", blocked_only: bool = False):
    """Get parsed WAF logs with filtering and pagination"""
    result = parse_audit_log()
    
    if "error" in result:
        return result
    
    logs = result["logs"]
    filtered_logs = []
    
    for log in logs:
        # Apply filters
        if search:
            search_lower = search.lower()
            if not (search_lower in log["source_ip"].lower() or 
                   search_lower in log["uri"].lower() or
                   any(search_lower in detail["data"].lower() for detail in log["attack_details"])):
                continue
        
        if attack_type and attack_type.upper() not in log["attack_types"]:
            continue
            
        if blocked_only and not log["blocked"]:
            continue
            
        filtered_logs.append(log)
    
    # Apply pagination
    total_filtered = len(filtered_logs)
    paginated_logs = filtered_logs[skip:skip + limit]
    
    return {
        "logs": paginated_logs,
        "total": total_filtered,
        "page": skip // limit + 1,
        "pages": (total_filtered + limit - 1) // limit,
        "has_next": skip + limit < total_filtered
    }

@app.get("/api/monitoring/stats")
def get_waf_stats():
    """Get WAF statistics"""
    result = parse_audit_log()
    
    if "error" in result:
        return result
    
    logs = result["logs"]
    
    stats = {
        "total_requests": len(logs),
        "blocked_requests": sum(1 for log in logs if log["blocked"]),
        "attack_types": {},
        "top_source_ips": {},
        "recent_attacks": logs[:5] if logs else []
    }
    
    for log in logs:
        # Count attack types
        for attack_type in log["attack_types"]:
            stats["attack_types"][attack_type] = stats["attack_types"].get(attack_type, 0) + 1
        
        # Count source IPs
        source_ip = log["source_ip"]
        stats["top_source_ips"][source_ip] = stats["top_source_ips"].get(source_ip, 0) + 1
    
    # Sort top IPs
    stats["top_source_ips"] = dict(sorted(stats["top_source_ips"].items(), key=lambda x: x[1], reverse=True)[:10])
    
    return stats

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)