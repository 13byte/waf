from fastapi import APIRouter, Request, UploadFile, File, Response
from app.infrastructure.config import settings
import os
import subprocess
import uuid
import mimetypes
import xml.etree.ElementTree as ET
import urllib.request
import jinja2
import requests

router = APIRouter(prefix="/vulnerable", tags=["Vulnerable"])

@router.get("/xss")
def vulnerable_xss_endpoint(input_data: str):
    return {"result": f"<div>User input: {input_data}</div>", "raw_input": input_data}

@router.get("/sqli")
def vulnerable_sql_injection(user_id: str):
    from app.infrastructure.database import engine
    from sqlalchemy import text
    
    try:
        with engine.connect() as connection:
            query = text(f"SELECT * FROM users WHERE id = {user_id}")
            result = connection.execute(query)
            return {"query": str(query), "result": "Query executed"}
    except Exception as e:
        return {"error": str(e), "query": f"SELECT * FROM users WHERE id = {user_id}"}

@router.get("/path-traversal")
def vulnerable_path_traversal(file_path: str):
    try:
        full_path = os.path.join(settings.upload_dir, file_path)
        with open(full_path, 'r') as f:
            content = f.read()
        return {"file_path": full_path, "content": content}
    except Exception as e:
        return {"error": str(e), "attempted_path": file_path}

@router.get("/command-injection")
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
            }
        else:
            return {"error": "Invalid execution type", "available_types": list(execution_methods.keys())}
    except subprocess.TimeoutExpired:
        return {"error": "Command timeout", "command": command, "execution_type": execution_type}
    except Exception as e:
        return {"error": str(e), "command": command, "execution_type": execution_type}

@router.get("/user-agent")
def vulnerable_user_agent_bypass(request: Request, access_level: str = "auto"):
    user_agent = request.headers.get("user-agent", "No User-Agent")
    
    privilege_patterns = {
        "admin": ["admin", "administrator", "root", "superuser"],
        "bot": ["googlebot", "bingbot", "slurp", "crawler", "spider"],
    }
    
    detected_privileges = []
    for privilege, patterns in privilege_patterns.items():
        if any(pattern in user_agent.lower() for pattern in patterns):
            detected_privileges.append(privilege)
    
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
        }
    elif "bot" in detected_privileges:
        return {
            "user_agent": user_agent,
            "access_level": "bot",
            "privileges": ["read", "index"],
            "rate_limit": "bypassed",
            "robots_txt": "ignored",
            "bypass_successful": True,
        }
    else:
        return {
            "user_agent": user_agent,
            "access_level": "guest",
            "privileges": ["read"],
            "detected_privileges": detected_privileges,
            "bypass_successful": False
        }

@router.get("/header-manipulation")
def vulnerable_header_manipulation(request: Request):
    headers = dict(request.headers)
    
    privilege_headers = {
        "x-admin-access": "admin",
        "x-privilege-escalation": "admin", 
        "x-bypass-auth": "admin",
        "x-internal-access": "internal",
        "x-debug-mode": "debug"
    }
    
    ip_headers = ["x-forwarded-for", "x-real-ip", "x-originating-ip", "cf-connecting-ip"]
    
    detected_privileges = []
    detected_ips = []
    
    for header, privilege in privilege_headers.items():
        if header in headers:
            detected_privileges.append({"header": header, "privilege": privilege, "value": headers[header]})
    
    for ip_header in ip_headers:
        if ip_header in headers:
            detected_ips.append({"header": ip_header, "spoofed_ip": headers[ip_header]})
    
    admin_access = any(priv["privilege"] == "admin" for priv in detected_privileges)
    ip_spoofed = len(detected_ips) > 0
    
    response_data = {
        "all_headers": headers,
        "detected_privileges": detected_privileges,
        "detected_ip_spoofing": detected_ips,
        "admin_access_granted": admin_access,
        "ip_spoofing_detected": ip_spoofed,
    }
    
    if admin_access:
        response_data.update({
            "sensitive_admin_data": {
                "internal_config": {"db_password": "hidden_pass123", "api_secret": "secret_key_456"},
                "user_data": {"total_users": 1247, "admin_users": 3},
            }
        })
    
    if ip_spoofed:
        response_data.update({
            "ip_spoofing_response": {
                "original_ip": "192.168.1.100",
                "spoofed_ips": [ip["spoofed_ip"] for ip in detected_ips],
            }
        })
    
    return response_data

@router.post("/file-upload")
async def vulnerable_file_upload(
    file: UploadFile = File(...),
    upload_path: str = "",
    bypass_validation: str = "false",
    custom_extension: str = ""
):
    try:
        os.makedirs(settings.upload_dir, exist_ok=True)
        
        original_filename = file.filename or "unknown"
        
        target_dir = os.path.join(settings.upload_dir, upload_path) if upload_path else settings.upload_dir
        os.makedirs(target_dir, exist_ok=True)
            
        final_filename = f"{os.path.splitext(original_filename)[0]}{custom_extension}" if custom_extension else original_filename
            
        dangerous_extensions = [".exe", ".bat", ".sh", ".php", ".asp", ".jsp", ".cmd"]
        is_dangerous = any(final_filename.lower().endswith(ext) for ext in dangerous_extensions)
        
        if bypass_validation.lower() != "true":
            allowed_extensions = settings.allowed_extensions_list
            file_ext_check = os.path.splitext(original_filename)[1].lower().lstrip('.')
            
            if file_ext_check not in allowed_extensions and not custom_extension:
                return {"error": "File type not allowed", "allowed_extensions": allowed_extensions}
        
        safe_filename = f"{uuid.uuid4()}_{final_filename}"
        file_path = os.path.join(target_dir, safe_filename)
        
        content = await file.read()
        
        with open(file_path, "wb") as f:
            f.write(content)
        
        return {
            "upload_successful": True,
            "saved_filename": safe_filename,
            "file_path": file_path,
            "is_dangerous": is_dangerous
        }
        
    except Exception as e:
        return {"error": f"Upload failed: {str(e)}"}

@router.get("/file-list")
def vulnerable_file_list(directory: str = ""):
    try:
        base_dir = settings.upload_dir
        target_dir = os.path.join(base_dir, directory) if directory else base_dir
            
        if not os.path.exists(target_dir):
            return {"error": "Directory not found", "attempted_path": target_dir}
            
        files = [{"name": item, "is_directory": os.path.isdir(os.path.join(target_dir, item))} for item in os.listdir(target_dir)]
            
        return {"directory": target_dir, "files": files}
        
    except Exception as e:
        return {"error": str(e), "attempted_directory": directory}

@router.get("/file-download")
def vulnerable_file_download(file_path: str):
    try:
        full_path = os.path.join(settings.upload_dir, file_path)
        
        if not os.path.exists(full_path) or os.path.isdir(full_path):
            return {"error": "File not found or is a directory", "attempted_path": full_path}
            
        with open(full_path, 'rb') as f:
            content = f.read()
            
        return {"file_path": full_path, "content_preview": content[:200].decode('utf-8', errors='ignore')}
        
    except Exception as e:
        return {"error": str(e), "attempted_path": file_path}

@router.post("/xxe")
async def vulnerable_xxe_endpoint(request: Request):
    """Vulnerable XXE (XML External Entity) endpoint for testing"""
    try:
        # Get raw body
        body = await request.body()
        
        # Parse XML without disabling external entities (vulnerable)
        parser = ET.XMLParser()
        root = ET.fromstring(body, parser=parser)
        
        # Process the XML
        result = ET.tostring(root, encoding='unicode')
        
        return {
            "parsed": True,
            "result": result,
            "message": "XML processed successfully"
        }
    except ET.ParseError as e:
        return {
            "error": f"XML Parse Error: {str(e)}",
            "parsed": False
        }
    except Exception as e:
        return {
            "error": f"Processing error: {str(e)}",
            "parsed": False
        }

@router.get("/ssti")
def vulnerable_ssti_endpoint(template: str = "Hello {{name}}"):
    """Vulnerable SSTI (Server-Side Template Injection) endpoint"""
    try:
        # Create unsafe Jinja2 environment (vulnerable)
        env = jinja2.Environment()
        
        # Render user-provided template directly (vulnerable)
        tmpl = env.from_string(template)
        
        # Render with context
        result = tmpl.render(
            name="user",
            config={"debug": True, "secret": "test_secret"},
            system=os,
            subprocess=subprocess
        )
        
        return {
            "template": template,
            "rendered": result,
            "engine": "Jinja2"
        }
    except jinja2.exceptions.TemplateSyntaxError as e:
        return {
            "error": f"Template syntax error: {str(e)}",
            "template": template
        }
    except Exception as e:
        return {
            "error": f"Template rendering error: {str(e)}",
            "template": template
        }

@router.get("/ssrf")
async def vulnerable_ssrf_endpoint(url: str):
    """Vulnerable SSRF (Server-Side Request Forgery) endpoint"""
    try:
        # No URL validation (vulnerable)
        if url.startswith("file://"):
            # File protocol (local file access)
            with urllib.request.urlopen(url) as response:
                content = response.read().decode('utf-8', errors='ignore')
            return {
                "url": url,
                "protocol": "file",
                "content": content[:1000],  # Limit response size
                "status": "success"
            }
        elif url.startswith("http://") or url.startswith("https://"):
            # HTTP/HTTPS requests
            response = requests.get(url, timeout=5, allow_redirects=True)
            return {
                "url": url,
                "protocol": "http/https",
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "content": response.text[:1000],  # Limit response size
                "final_url": response.url
            }
        elif url.startswith("gopher://") or url.startswith("dict://"):
            # Other protocols
            with urllib.request.urlopen(url, timeout=5) as response:
                content = response.read().decode('utf-8', errors='ignore')
            return {
                "url": url,
                "protocol": url.split("://")[0],
                "content": content[:1000],
                "status": "success"
            }
        else:
            # Try as internal network address
            if not url.startswith("http"):
                url = f"http://{url}"
            response = requests.get(url, timeout=5)
            return {
                "url": url,
                "internal_request": True,
                "status_code": response.status_code,
                "content": response.text[:1000]
            }
    except requests.exceptions.Timeout:
        return {
            "error": "Request timeout",
            "url": url
        }
    except requests.exceptions.ConnectionError as e:
        return {
            "error": f"Connection error: {str(e)}",
            "url": url
        }
    except Exception as e:
        return {
            "error": f"SSRF request failed: {str(e)}",
            "url": url
        }
