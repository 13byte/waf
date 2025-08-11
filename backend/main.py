from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from app.config import settings
from app.routers import auth, posts
import os
import subprocess
import uuid
import mimetypes

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)