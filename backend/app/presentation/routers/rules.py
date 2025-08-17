# WAF Rules endpoint for managing CRS and custom rules
from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime
import os
import re
import json
from pathlib import Path

from ...infrastructure.database import get_db
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/rules", tags=["Rules"])

# Rule paths in Docker container
CRS_RULES_PATH = "/opt/owasp-crs/rules"
CUSTOM_RULES_PATH = "/opt/custom-rules"

def parse_modsecurity_rule(content: str) -> List[Dict[str, Any]]:
    """Parse ModSecurity rule content and extract rule details"""
    rules = []
    
    # More comprehensive regex patterns
    rule_pattern = r'SecRule\s+([^\s]+)\s+"([^"]+)"\s+"([^"]+)"'
    sec_action_pattern = r'SecAction\s+"([^"]+)"'
    
    # Find all SecRules
    for match in re.finditer(rule_pattern, content, re.MULTILINE | re.DOTALL):
        variable = match.group(1)
        operator = match.group(2)
        actions = match.group(3)
        
        rule = parse_rule_actions(actions)
        rule['variable'] = variable
        rule['operator'] = operator
        rules.append(rule)
    
    # Find all SecActions (rules without conditions)
    for match in re.finditer(sec_action_pattern, content, re.MULTILINE | re.DOTALL):
        actions = match.group(1)
        rule = parse_rule_actions(actions)
        rule['variable'] = 'N/A'
        rule['operator'] = 'N/A'
        rules.append(rule)
    
    return rules

def parse_rule_actions(actions: str) -> Dict[str, Any]:
    """Parse rule actions string and extract metadata"""
    rule = {
        'id': 'unknown',
        'description': '',
        'severity': 'INFO',
        'tags': [],
        'paranoia_level': None,
        'anomaly_score': None,
        'message': '',
        'phase': None,
        'action': 'pass',
        'maturity': None,
        'accuracy': None
    }
    
    # Parse rule ID
    id_match = re.search(r'id:(\d+)', actions)
    if id_match:
        rule['id'] = id_match.group(1)
    
    # Parse message
    msg_match = re.search(r'msg:[\'"]([^\'\"]+)[\'"]', actions)
    if msg_match:
        rule['message'] = msg_match.group(1)
        rule['description'] = msg_match.group(1)
    
    # Parse severity
    severity_match = re.search(r'severity:[\'"]?(\w+)[\'"]?', actions)
    if severity_match:
        rule['severity'] = severity_match.group(1).upper()
    
    # Parse tags
    tag_pattern = r'tag:[\'"]([^\'\"]+)[\'"]'
    tags = re.findall(tag_pattern, actions)
    rule['tags'] = tags
    
    # Parse paranoia level from tags
    for tag in tags:
        if 'paranoia-level' in tag.lower():
            pl_match = re.search(r'(\d+)', tag)
            if pl_match:
                rule['paranoia_level'] = int(pl_match.group(1))
        elif 'maturity' in tag.lower():
            mat_match = re.search(r'(\d+)', tag)
            if mat_match:
                rule['maturity'] = int(mat_match.group(1))
        elif 'accuracy' in tag.lower():
            acc_match = re.search(r'(\d+)', tag)
            if acc_match:
                rule['accuracy'] = int(acc_match.group(1))
    
    # Parse anomaly score
    score_match = re.search(r'setvar:.*anomaly_score.*\+=(\d+)', actions)
    if score_match:
        rule['anomaly_score'] = int(score_match.group(1))
    
    # Parse phase
    phase_match = re.search(r'phase:(\d+)', actions)
    if phase_match:
        rule['phase'] = int(phase_match.group(1))
    
    # Parse action
    if 'block' in actions.lower():
        rule['action'] = 'block'
    elif 'deny' in actions.lower():
        rule['action'] = 'deny'
    elif 'drop' in actions.lower():
        rule['action'] = 'drop'
    elif 'pass' in actions.lower():
        rule['action'] = 'pass'
    elif 'log' in actions.lower() and 'nolog' not in actions.lower():
        rule['action'] = 'log'
    
    return rule

def get_rule_files(path: str) -> List[Dict[str, Any]]:
    """Get all rule files from a directory"""
    files = []
    rules_dir = Path(path)
    
    if rules_dir.exists() and rules_dir.is_dir():
        for rule_file in sorted(rules_dir.glob("*.conf")):
            # Skip data files
            if 'data' in rule_file.name.lower() or rule_file.name.startswith('.'):
                continue
                
            files.append({
                'name': rule_file.name,
                'path': str(rule_file),
                'size': rule_file.stat().st_size,
                'modified': datetime.fromtimestamp(rule_file.stat().st_mtime).isoformat()
            })
    
    return files

def read_rule_file(file_path: str) -> Dict[str, Any]:
    """Read and parse a single rule file"""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            
        # Parse rules
        rules = parse_modsecurity_rule(content)
        
        # Extract file metadata
        file_name = Path(file_path).name
        category_match = re.match(r'(REQUEST|RESPONSE)-(\d+)-(.+)\.conf', file_name)
        
        if category_match:
            phase_type = category_match.group(1)
            category_num = category_match.group(2)
            category_name = category_match.group(3).replace('-', ' ').title()
        else:
            phase_type = 'CUSTOM'
            category_num = '000'
            category_name = file_name.replace('.conf', '').replace('-', ' ').title()
        
        return {
            'file': file_name,
            'category_id': f'{phase_type}-{category_num}',
            'category_name': category_name,
            'phase_type': phase_type,
            'rules': rules,
            'rule_count': len(rules)
        }
        
    except Exception as e:
        return {
            'file': file_path,
            'error': str(e),
            'rules': []
        }

@router.get("/files")
async def get_rule_files_list(
    source: str = Query('crs', description="Rule source: 'crs' or 'custom'"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get list of rule files"""
    
    if source == 'crs':
        path = CRS_RULES_PATH
    elif source == 'custom':
        path = CUSTOM_RULES_PATH
    else:
        raise HTTPException(status_code=400, detail="Invalid source. Use 'crs' or 'custom'")
    
    files = get_rule_files(path)
    
    return {
        'source': source,
        'path': path,
        'files': files,
        'total': len(files)
    }

@router.get("/file/{file_name}")
async def get_rule_file_content(
    file_name: str,
    source: str = Query('crs', description="Rule source: 'crs' or 'custom'"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get parsed content of a specific rule file"""
    
    if source == 'crs':
        base_path = CRS_RULES_PATH
    elif source == 'custom':
        base_path = CUSTOM_RULES_PATH
    else:
        raise HTTPException(status_code=400, detail="Invalid source")
    
    file_path = os.path.join(base_path, file_name)
    
    # Security check - prevent directory traversal
    if not os.path.abspath(file_path).startswith(os.path.abspath(base_path)):
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    result = read_rule_file(file_path)
    return result

@router.get("/raw/{file_name}")
async def get_raw_rule_file(
    file_name: str,
    source: str = Query('crs', description="Rule source: 'crs' or 'custom'"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get raw content of a rule file"""
    
    if source == 'crs':
        base_path = CRS_RULES_PATH
    elif source == 'custom':
        base_path = CUSTOM_RULES_PATH
    else:
        raise HTTPException(status_code=400, detail="Invalid source")
    
    file_path = os.path.join(base_path, file_name)
    
    # Security check
    if not os.path.abspath(file_path).startswith(os.path.abspath(base_path)):
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path, media_type='text/plain')

@router.get("")
async def get_all_rules(
    source: str = Query('all', description="Rule source: 'all', 'crs', or 'custom'"),
    search: Optional[str] = Query(None, description="Search in rule ID or description"),
    severity: Optional[str] = Query(None, description="Filter by severity level"),
    category: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get all rules organized by categories"""
    
    categories = []
    
    # Get CRS rules
    if source in ['all', 'crs']:
        crs_files = get_rule_files(CRS_RULES_PATH)
        for file_info in crs_files:
            file_data = read_rule_file(file_info['path'])
            if file_data.get('rules'):
                categories.append({
                    'id': file_data['category_id'],
                    'name': file_data['category_name'],
                    'description': f"CRS {file_data['phase_type']} rules from {file_data['file']}",
                    'source': 'crs',
                    'file': file_data['file'],
                    'enabled': True,
                    'rules': file_data['rules'],
                    'ruleCount': len(file_data['rules']),
                    'lastUpdated': file_info['modified']
                })
    
    # Get custom rules
    if source in ['all', 'custom']:
        custom_files = get_rule_files(CUSTOM_RULES_PATH)
        for file_info in custom_files:
            file_data = read_rule_file(file_info['path'])
            if file_data.get('rules'):
                categories.append({
                    'id': f"custom-{file_data['category_id']}",
                    'name': f"Custom: {file_data['category_name']}",
                    'description': f"Custom rules from {file_data['file']}",
                    'source': 'custom',
                    'file': file_data['file'],
                    'enabled': True,
                    'rules': file_data['rules'],
                    'ruleCount': len(file_data['rules']),
                    'lastUpdated': file_info['modified']
                })
    
    # Apply filters
    if search:
        search_lower = search.lower()
        for cat in categories:
            cat['rules'] = [
                rule for rule in cat['rules']
                if search_lower in rule.get('id', '').lower() or 
                   search_lower in rule.get('description', '').lower() or
                   any(search_lower in tag.lower() for tag in rule.get('tags', []))
            ]
    
    if severity:
        severity_upper = severity.upper()
        for cat in categories:
            cat['rules'] = [
                rule for rule in cat['rules']
                if rule.get('severity', '').upper() == severity_upper
            ]
    
    if category:
        categories = [cat for cat in categories if category.lower() in cat['id'].lower()]
    
    # Calculate statistics
    total_rules = sum(cat['ruleCount'] for cat in categories)
    severity_distribution = {}
    paranoia_distribution = {}
    
    for cat in categories:
        for rule in cat['rules']:
            # Severity distribution
            sev = rule.get('severity', 'INFO')
            severity_distribution[sev] = severity_distribution.get(sev, 0) + 1
            
            # Paranoia level distribution
            pl = rule.get('paranoia_level')
            if pl:
                pl_key = f"Level {pl}"
                paranoia_distribution[pl_key] = paranoia_distribution.get(pl_key, 0) + 1
    
    return {
        'categories': categories,
        'statistics': {
            'total_categories': len(categories),
            'total_rules': total_rules,
            'crs_categories': len([c for c in categories if c['source'] == 'crs']),
            'custom_categories': len([c for c in categories if c['source'] == 'custom']),
            'severity_distribution': severity_distribution,
            'paranoia_distribution': paranoia_distribution,
            'enabled_categories': len([c for c in categories if c.get('enabled', False)])
        }
    }

@router.post("/custom")
async def create_custom_rule(
    rule_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new custom rule file"""
    
    try:
        file_name = rule_data.get('file_name', f'custom-{datetime.now().strftime("%Y%m%d-%H%M%S")}.conf')
        
        # Ensure .conf extension
        if not file_name.endswith('.conf'):
            file_name += '.conf'
        
        file_path = os.path.join(CUSTOM_RULES_PATH, file_name)
        
        # Generate rule content
        rules = rule_data.get('rules', [])
        content = f"# Custom WAF Rules - Created {datetime.now().isoformat()}\n"
        content += f"# Created by: {current_user.username}\n\n"
        
        for rule in rules:
            # Build SecRule
            variable = rule.get('variable', 'REQUEST_URI')
            operator = rule.get('operator', '@rx')
            pattern = rule.get('pattern', '.*')
            
            actions = []
            if rule.get('id'):
                actions.append(f"id:{rule['id']}")
            if rule.get('phase'):
                actions.append(f"phase:{rule['phase']}")
            if rule.get('message'):
                actions.append(f'msg:"{rule["message"]}"')
            if rule.get('severity'):
                actions.append(f"severity:{rule['severity']}")
            if rule.get('action'):
                actions.append(rule['action'])
            if rule.get('anomaly_score'):
                actions.append(f"setvar:tx.anomaly_score_pl1+={rule['anomaly_score']}")
            
            # Add tags
            for tag in rule.get('tags', []):
                actions.append(f'tag:"{tag}"')
            
            actions_str = ','.join(actions)
            content += f'SecRule {variable} "{operator} {pattern}" "{actions_str}"\n\n'
        
        # Create directory if it doesn't exist
        os.makedirs(CUSTOM_RULES_PATH, exist_ok=True)
        
        # Write file
        with open(file_path, 'w') as f:
            f.write(content)
        
        return {
            'success': True,
            'file': file_name,
            'path': file_path,
            'rules_count': len(rules)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create rule: {str(e)}")

@router.put("/custom/{file_name}")
async def update_custom_rule(
    file_name: str,
    rule_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update an existing custom rule file"""
    
    file_path = os.path.join(CUSTOM_RULES_PATH, file_name)
    
    # Security check
    if not os.path.abspath(file_path).startswith(os.path.abspath(CUSTOM_RULES_PATH)):
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        # Similar to create, but update existing file
        rules = rule_data.get('rules', [])
        content = f"# Custom WAF Rules - Updated {datetime.now().isoformat()}\n"
        content += f"# Updated by: {current_user.username}\n\n"
        
        for rule in rules:
            variable = rule.get('variable', 'REQUEST_URI')
            operator = rule.get('operator', '@rx')
            pattern = rule.get('pattern', '.*')
            
            actions = []
            if rule.get('id'):
                actions.append(f"id:{rule['id']}")
            if rule.get('phase'):
                actions.append(f"phase:{rule['phase']}")
            if rule.get('message'):
                actions.append(f'msg:"{rule["message"]}"')
            if rule.get('severity'):
                actions.append(f"severity:{rule['severity']}")
            if rule.get('action'):
                actions.append(rule['action'])
            
            for tag in rule.get('tags', []):
                actions.append(f'tag:"{tag}"')
            
            actions_str = ','.join(actions)
            content += f'SecRule {variable} "{operator} {pattern}" "{actions_str}"\n\n'
        
        with open(file_path, 'w') as f:
            f.write(content)
        
        return {
            'success': True,
            'file': file_name,
            'rules_count': len(rules)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update rule: {str(e)}")

@router.delete("/custom/{file_name}")
async def delete_custom_rule(
    file_name: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a custom rule file"""
    
    file_path = os.path.join(CUSTOM_RULES_PATH, file_name)
    
    # Security check
    if not os.path.abspath(file_path).startswith(os.path.abspath(CUSTOM_RULES_PATH)):
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        os.remove(file_path)
        return {'success': True, 'message': f'File {file_name} deleted'}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete rule: {str(e)}")

@router.post("/test")
async def test_rule(
    test_data: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Test a rule against sample data"""
    
    # This would integrate with ModSecurity's testing capabilities
    # For now, return a mock response
    
    rule = test_data.get('rule', {})
    test_input = test_data.get('test_input', '')
    
    # Simple pattern matching for demonstration
    import re
    pattern = rule.get('pattern', '.*')
    variable = rule.get('variable', 'REQUEST_URI')
    
    try:
        if re.search(pattern, test_input):
            return {
                'matched': True,
                'action': rule.get('action', 'block'),
                'message': rule.get('message', 'Rule matched'),
                'severity': rule.get('severity', 'HIGH')
            }
        else:
            return {
                'matched': False,
                'message': 'Rule did not match'
            }
    except Exception as e:
        return {
            'error': str(e),
            'matched': False
        }