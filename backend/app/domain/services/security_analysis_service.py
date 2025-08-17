# Security analysis service
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from ..models.security_event import SecurityEvent, AttackType, SeverityLevel

class SecurityAnalysisService:
    
    @staticmethod
    def calculate_threat_level(events: List[SecurityEvent]) -> Dict[str, Any]:
        """Calculate threat level based on events"""
        if not events:
            return {
                "level": "low",
                "score": 0,
                "reasons": []
            }
        
        reasons = []
        score = 0
        
        # Check attack rate
        attack_count = sum(1 for e in events if e.is_attack)
        attack_rate = attack_count / len(events) if events else 0
        
        if attack_rate > 0.5:
            score += 40
            reasons.append("High attack rate detected")
        elif attack_rate > 0.2:
            score += 20
            reasons.append("Moderate attack rate")
        
        # Check critical events
        critical_count = sum(1 for e in events if e.severity == SeverityLevel.CRITICAL)
        if critical_count > 0:
            score += critical_count * 10
            reasons.append(f"{critical_count} critical events detected")
        
        # Check blocked rate
        blocked_count = sum(1 for e in events if e.is_blocked)
        block_rate = blocked_count / len(events) if events else 0
        if block_rate > 0.7:
            score += 30
            reasons.append("High block rate indicates active threats")
        
        # Determine level
        if score >= 70:
            level = "critical"
        elif score >= 50:
            level = "high"
        elif score >= 30:
            level = "medium"
        else:
            level = "low"
        
        return {
            "level": level,
            "score": min(100, score),
            "reasons": reasons
        }
    
    @staticmethod
    def identify_suspicious_ips(events: List[SecurityEvent]) -> List[Dict[str, Any]]:
        """Identify suspicious IPs from events"""
        ip_stats = {}
        
        for event in events:
            if event.source_ip not in ip_stats:
                ip_stats[event.source_ip] = {
                    "total_requests": 0,
                    "attack_count": 0,
                    "blocked_count": 0,
                    "attack_types": set()
                }
            
            stats = ip_stats[event.source_ip]
            stats["total_requests"] += 1
            
            if event.is_attack:
                stats["attack_count"] += 1
                if event.attack_type:
                    stats["attack_types"].add(event.attack_type)
            
            if event.is_blocked:
                stats["blocked_count"] += 1
        
        # Calculate threat scores
        suspicious_ips = []
        for ip, stats in ip_stats.items():
            threat_score = 0
            
            # Attack rate factor
            attack_rate = stats["attack_count"] / stats["total_requests"]
            threat_score += attack_rate * 40
            
            # Attack diversity factor  
            threat_score += len(stats["attack_types"]) * 10
            
            # Block rate factor
            block_rate = stats["blocked_count"] / stats["total_requests"]
            threat_score += block_rate * 30
            
            # Volume factor
            if stats["total_requests"] > 100:
                threat_score += 20
            elif stats["total_requests"] > 50:
                threat_score += 10
            
            if threat_score > 30:
                suspicious_ips.append({
                    "ip": ip,
                    "threat_score": min(100, threat_score),
                    "total_requests": stats["total_requests"],
                    "attack_count": stats["attack_count"],
                    "attack_types": list(stats["attack_types"])
                })
        
        return sorted(suspicious_ips, key=lambda x: x["threat_score"], reverse=True)
    
    @staticmethod
    def calculate_risk_score(event: SecurityEvent) -> float:
        """Calculate risk score for a single event"""
        score = 0.0
        
        # Severity factor
        severity_scores = {
            SeverityLevel.LOW: 10,
            SeverityLevel.MEDIUM: 30,
            SeverityLevel.HIGH: 60,
            SeverityLevel.CRITICAL: 100
        }
        score += severity_scores.get(event.severity, 0) * 0.4
        
        # Attack type factor
        if event.is_attack:
            score += 30
            
        # Anomaly score factor
        if event.anomaly_score > 10:
            score += 20
        elif event.anomaly_score > 5:
            score += 10
        
        # Blocked factor (reduces risk if blocked)
        if event.is_blocked:
            score *= 0.7
        
        return min(100.0, score)