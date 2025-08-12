import re
import json
from typing import Dict, List, Tuple, Optional
from datetime import datetime
import logging

class AttackDetectionEngine:
    """
    Attack detection logic based on ModSecurity rule analysis
    """
    
    # Rule file patterns for attack classification
    ATTACK_RULE_PATTERNS = {
        'XSS': r'REQUEST-941-APPLICATION-ATTACK-XSS\.conf',
        'SQLI': r'REQUEST-942-APPLICATION-ATTACK-SQLI\.conf', 
        'LFI': r'REQUEST-930-APPLICATION-ATTACK-LFI\.conf',
        'RFI': r'REQUEST-931-APPLICATION-ATTACK-RFI\.conf',
        'RCE': r'REQUEST-932-APPLICATION-ATTACK-RCE\.conf',
        'PHP': r'REQUEST-933-APPLICATION-ATTACK-PHP\.conf',
        'NODEJS': r'REQUEST-934-APPLICATION-ATTACK-NODEJS\.conf',
        'JAVA': r'REQUEST-944-APPLICATION-ATTACK-JAVA\.conf',
        'SCANNER': r'REQUEST-913-SCANNER-DETECTION\.conf',
        'SESSION': r'REQUEST-943-APPLICATION-ATTACK-SESSION',
        'PROTOCOL': r'REQUEST-920-PROTOCOL-ENFORCEMENT\.conf',
        'MULTIPART': r'REQUEST-922-MULTIPART-ATTACK\.conf',
        'XML': r'REQUEST-923-REQUEST-DATA'
    }
    
    # Generic attack pattern - matches REQUEST-XXX-*-ATTACK-* format
    GENERIC_ATTACK_PATTERN = r'REQUEST-\d+.*-ATTACK-'
    
    # Blocking evaluation rule ID
    BLOCKING_RULE_ID = "949110"
    
    @classmethod
    def analyze_log_entry(cls, log_json: dict) -> Dict:
        """
        Analyze ModSecurity log entry with attack detection
        
        Args:
            log_json: Raw ModSecurity log entry
            
        Returns:
            Dict containing parsed log data with classification
        """
        transaction = log_json.get("transaction", {})
        messages = transaction.get("messages", [])
        logging.info(f"analyze_log_entry called with {len(messages)} messages")
        try:
            request = transaction.get("request", {})
            response = transaction.get("response", {})
            
            # Extract network information
            network_info = cls._extract_network_info(transaction)
            
            # Extract request information
            request_info = cls._extract_request_info(transaction, request, response)
            
            # Enhanced attack detection
            attack_analysis = cls._analyze_attack_indicators(messages)
            
            # Determine blocking status
            blocking_analysis = cls._analyze_blocking_status(messages, response.get("http_code", 0))
            
            return {
                **network_info,
                **request_info,
                **attack_analysis,
                **blocking_analysis,
                'log_unique_id': transaction.get('unique_id'),
                'timestamp': cls._parse_timestamp(transaction.get('time_stamp')),
                'raw_log': log_json
            }
            
        except Exception as e:
            logging.error(f"Error analyzing log entry: {e}")
            return None
    
    @classmethod
    def _extract_network_info(cls, transaction: dict) -> Dict:
        """Extract network information from transaction (aligned with DB schema)"""
        # Extract target website from Host header
        request_headers = transaction.get('request', {}).get('headers', {})
        target_website = request_headers.get('Host', 'unknown')
        
        return {
            'source_ip': transaction.get('client_ip', 'unknown'),
            'source_port': transaction.get('client_port'),
            'dest_ip': transaction.get('host_ip'),
            'dest_port': transaction.get('host_port'),
            'target_website': target_website,
            'client_ip': transaction.get('client_ip', 'unknown')  # Backward compatibility
        }
    
    @classmethod
    def _extract_request_info(cls, transaction: dict, request: dict, response: dict) -> Dict:
        """Extract request information"""
        return {
            'method': request.get('method'),
            'uri': request.get('uri'),
            'status_code': response.get('http_code', 0)
        }
    
    @classmethod
    def _analyze_attack_indicators(cls, messages: List[dict]) -> Dict:
        """
        Analyze messages for attack indicators (aligned with DB schema)
        
        Returns:
            Dict with attack_types, rule_ids, severity_score
        """
        attack_types = set()
        rule_ids = []
        rule_files = []
        total_severity = 0
        anomaly_score = 0
        has_actual_violations = False
        
        # Known evaluation/scoring rule IDs that are not actual attack detections
        EVALUATION_RULES = {"949110", "949111", "980130", "980140", "980170"}
        
        for msg in messages:
            details = msg.get("details", {})
            
            # Extract rule information
            rule_id = details.get("ruleId")
            rule_file = details.get("file", "")
            severity = details.get("severity", "0")
            
            if rule_id:
                rule_ids.append(rule_id)
                # Check if this is an actual attack rule (not just blocking/scoring evaluation)
                if rule_id not in EVALUATION_RULES:
                    # Check if the rule file indicates an attack pattern
                    if rule_file and ('ATTACK' in rule_file.upper() or 
                                    'SCANNER' in rule_file.upper() or
                                    'PROTOCOL' in rule_file.upper()):
                        has_actual_violations = True
            
            if rule_file:
                rule_files.append(rule_file)
                # Classify attack type based on rule file pattern
                # Extract just the filename from the full path for pattern matching
                rule_filename = rule_file.split('/')[-1] if '/' in rule_file else rule_file
                attack_type = cls._classify_attack_type(rule_filename)
                if attack_type:
                    attack_types.add(attack_type)
            
            # Calculate severity score
            try:
                severity_val = int(severity) if severity.isdigit() else 0
                total_severity += severity_val
            except (ValueError, TypeError):
                pass
            
            # Check for anomaly score in message
            if "Inbound Anomaly Score" in msg.get("message", ""):
                try:
                    # Extract anomaly score from match field for rule 949110
                    match = details.get("match", "")
                    if "Value: `" in match:
                        score_str = match.split("Value: `")[1].split("'")[0]
                        anomaly_score = max(anomaly_score, int(score_str))
                except:
                    pass
            elif "Inbound Anomaly Score" in details.get("data", ""):
                try:
                    # Fallback: Extract anomaly score from data field
                    data = details.get("data", "")
                    if "Score " in data:
                        score_str = data.split("Score ")[1].split(" ")[0]
                        anomaly_score = max(anomaly_score, int(score_str))
                except:
                    pass
        
        # Improved attack detection logic:
        # Attack is confirmed when:
        # 1. There are actual attack detection rules triggered (not just scoring/evaluation)
        # 2. AND attack types were identified from rule files
        # Note: 403 status alone doesn't confirm attack (could be legitimate access denial)
        # Note: Anomaly score alone doesn't confirm attack (could be cumulative from minor issues)
        # Improved attack detection logic:
        # Only consider it an attack if:
        # 1. There are actual rule violations (not just scoring/evaluation rules)
        # 2. Attack types were successfully identified from rule patterns
        is_attack = has_actual_violations and len(attack_types) > 0
        
        # Log detection details for debugging
        if len(messages) > 0:
            logging.info(f"Attack detection: violations={has_actual_violations}, "
                       f"types={attack_types}, score={anomaly_score}, "
                       f"is_attack={is_attack}")
        
        return {
            'attack_types': list(attack_types),
            'rule_ids': rule_ids,
            'rule_files': list(set(rule_files)),
            'severity_score': total_severity,
            'anomaly_score': anomaly_score,
            'is_attack': is_attack
        }
    
    @classmethod
    def _analyze_blocking_status(cls, messages: List[dict], status_code: int) -> Dict:
        """
        Determine actual blocking status based on blocking evaluation rules
        
        Args:
            messages: ModSecurity messages
            status_code: HTTP response status code
            
        Returns:
            Dict with is_blocked status
        """
        # Check for blocking evaluation rule (949110 = Inbound Anomaly Score Exceeded)
        has_blocking_rule = any(
            msg.get("details", {}).get("ruleId") == cls.BLOCKING_RULE_ID
            for msg in messages
        )
        
        # Check if there are actual attack rules (not just scoring)
        has_attack_violations = False
        EVALUATION_RULES = {"949110", "949111", "980130", "980140", "980170"}
        
        for msg in messages:
            rule_file = msg.get("details", {}).get("file", "")
            rule_id = msg.get("details", {}).get("ruleId")
            
            # Skip scoring and informational rules
            if rule_id and rule_id not in EVALUATION_RULES:
                if rule_file and ('ATTACK' in rule_file.upper() or 
                                'SCANNER' in rule_file.upper() or
                                'PROTOCOL' in rule_file.upper()):
                    has_attack_violations = True
                    break
        
        # Extract anomaly score for additional context
        anomaly_score = 0
        for msg in messages:
            # Check for anomaly score in blocking evaluation rule
            if "Inbound Anomaly Score" in msg.get("message", ""):
                try:
                    match = msg.get("details", {}).get("match", "")
                    if "Value: `" in match:
                        score_str = match.split("Value: `")[1].split("'")[0]
                        anomaly_score = max(anomaly_score, int(score_str))
                except:
                    pass
            # Fallback to data field
            data = msg.get("details", {}).get("data", "")
            if "Inbound Anomaly Score" in data and "Score " in data:
                try:
                    score_str = data.split("Score ")[1].split(" ")[0]
                    anomaly_score = max(anomaly_score, int(score_str))
                except:
                    pass
        
        # Enhanced blocking detection logic:
        # WAF blocks when:
        # 1. Status code is 403 AND
        # 2. Either:
        #    a. Has blocking evaluation rule (949110) with anomaly score >= 5 (default threshold)
        #    b. Has actual attack violations with high anomaly score
        is_blocked = False
        
        if status_code == 403:
            # Standard blocking: blocking rule present with sufficient anomaly score
            if has_blocking_rule and anomaly_score >= 5:
                is_blocked = True
            # Alternative blocking: attack violations with high score
            elif has_attack_violations and anomaly_score >= 5:
                is_blocked = True
        
        # Log blocking decision for debugging
        if len(messages) > 0:
            logging.info(f"Blocking detection: status={status_code}, blocking_rule={has_blocking_rule}, "
                       f"violations={has_attack_violations}, score={anomaly_score}, "
                       f"is_blocked={is_blocked}")
        
        return {'is_blocked': is_blocked}
    
    @classmethod
    def _classify_attack_type(cls, rule_file: str) -> Optional[str]:
        """Classify attack type based on rule file pattern"""
        # First check specific patterns
        for attack_type, pattern in cls.ATTACK_RULE_PATTERNS.items():
            if re.search(pattern, rule_file):
                return attack_type
        
        # Check generic attack pattern (REQUEST-XXX-*-ATTACK-*)
        if re.search(cls.GENERIC_ATTACK_PATTERN, rule_file):
            # Try to extract attack type from filename
            match = re.search(r'REQUEST-\d+.*-ATTACK-([A-Z-]+)', rule_file)
            if match:
                attack_name = match.group(1).replace('.conf', '').replace('-', '_')
                return attack_name
            return 'UNKNOWN_ATTACK'
        
        # Check if file contains ATTACK keyword
        if 'ATTACK' in rule_file.upper():
            return 'ATTACK'
            
        return None
    
    @classmethod
    def _parse_timestamp(cls, timestamp_str: str) -> Optional[datetime]:
        """Parse ModSecurity timestamp format"""
        try:
            # Format: "Mon Aug 11 09:19:10 2025"
            return datetime.strptime(timestamp_str, "%a %b %d %H:%M:%S %Y")
        except (ValueError, TypeError):
            return None
