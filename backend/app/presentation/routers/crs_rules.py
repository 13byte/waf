from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import subprocess
import os

router = APIRouter(prefix="/api/crs-rules", tags=["CRS Rules"])

@router.get("/list")
async def list_crs_rules() -> Dict[str, Any]:
    """List CRS rule files with statistics"""
    try:
        docker_check = subprocess.run(["which", "docker"], capture_output=True, text=True)
        if docker_check.returncode != 0:
            shared_path = "/app/nginx/crs-rules"
            if os.path.exists(shared_path):
                files = [f for f in os.listdir(shared_path) if f.endswith('.conf')]
                
                total_rules = 0
                critical_rules = 0
                file_stats = []
                
                for file in sorted(files):
                    filepath = os.path.join(shared_path, file)
                    try:
                        with open(filepath, 'r') as f:
                            content = f.read()
                            rule_count = content.count('SecRule')
                            critical_count = (
                                content.count('severity:"CRITICAL"') + 
                                content.count("severity:'CRITICAL'") +
                                content.count('severity:CRITICAL') +
                                content.count('severity:"ERROR"') + 
                                content.count("severity:'ERROR'") +
                                content.count('severity:ERROR')
                            )
                            total_rules += rule_count
                            critical_rules += critical_count
                            file_stats.append({
                                "filename": file,
                                "rule_count": rule_count
                            })
                    except:
                        file_stats.append({
                            "filename": file,
                            "rule_count": 0
                        })
                
                return {
                    "total_files": len(files),
                    "total_rules": total_rules,
                    "critical_rules": critical_rules,
                    "rules": sorted(files),
                    "file_stats": file_stats
                }
            else:
                raise HTTPException(status_code=503, detail="CRS rules not available")
        
        result = subprocess.run(
            ["docker", "exec", "waf_nginx", "ls", "-la", "/opt/owasp-crs/rules/"],
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode != 0:
            raise HTTPException(status_code=500, detail="Failed to list rules")
        
        lines = result.stdout.strip().split('\n')
        rule_files = []
        
        for line in lines:
            if line.endswith('.conf'):
                parts = line.split()
                if len(parts) >= 9:
                    filename = parts[-1]
                    rule_files.append(filename)
        
        return {
            "total": len(rule_files),
            "rules": sorted(rule_files)
        }
        
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/content")
async def read_crs_rule(filename: str) -> Dict[str, Any]:
    """Read specific CRS rule file content"""
    
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")
    
    if not filename.endswith('.conf'):
        filename += '.conf'
    
    try:
        docker_check = subprocess.run(["which", "docker"], capture_output=True, text=True)
        if docker_check.returncode != 0:
            shared_path = f"/app/nginx/crs-rules/{filename}"
            if os.path.exists(shared_path):
                with open(shared_path, 'r') as f:
                    content = f.read()
            else:
                raise HTTPException(status_code=503, detail="CRS rules not available")
        else:
            result = subprocess.run(
                ["docker", "exec", "waf_nginx", "cat", f"/opt/owasp-crs/rules/{filename}"],
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode != 0:
                raise HTTPException(status_code=404, detail=f"File not found: {filename}")
            
            content = result.stdout
        
        rule_count = content.count('SecRule')
        
        return {
            "filename": filename,
            "content": content,
            "size": len(content),
            "rule_count": rule_count
        }
        
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/search")
async def search_in_rules(keyword: str) -> Dict[str, Any]:
    """Search for keyword across all CRS rules"""
    
    if not keyword or len(keyword) < 3:
        raise HTTPException(status_code=400, detail="Keyword must be at least 3 characters")
    
    try:
        docker_check = subprocess.run(["which", "docker"], capture_output=True, text=True)
        if docker_check.returncode != 0:
            shared_path = "/app/nginx/crs-rules"
            matches = []
            if os.path.exists(shared_path):
                for filename in os.listdir(shared_path):
                    if filename.endswith('.conf'):
                        filepath = os.path.join(shared_path, filename)
                        with open(filepath, 'r') as f:
                            for line_num, line in enumerate(f, 1):
                                if keyword.lower() in line.lower():
                                    matches.append({
                                        "file": filename,
                                        "line": line.strip()
                                    })
                                    if len(matches) >= 100:
                                        break
                return {
                    "keyword": keyword,
                    "total_matches": len(matches),
                    "matches": matches
                }
            else:
                raise HTTPException(status_code=503, detail="CRS rules not available")
        
        result = subprocess.run(
            ["docker", "exec", "waf_nginx", "grep", "-r", keyword, "/opt/owasp-crs/rules/"],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        matches = []
        if result.returncode == 0 and result.stdout:
            lines = result.stdout.strip().split('\n')
            
            for line in lines[:100]:
                if ':' in line:
                    parts = line.split(':', 1)
                    filename = parts[0].replace('/opt/owasp-crs/rules/', '')
                    content = parts[1] if len(parts) > 1 else ''
                    matches.append({
                        "file": filename,
                        "line": content.strip()
                    })
        
        return {
            "keyword": keyword,
            "total_matches": len(matches),
            "matches": matches
        }
        
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Search timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))