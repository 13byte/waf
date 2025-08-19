// Security analysis domain service
import { SecurityEvent, SecurityEventEntity, AttackType, SeverityLevel } from '../entities/SecurityEvent';
import { IpAddress } from '../value-objects/IpAddress';
import { TimeRange } from '../value-objects/TimeRange';

export interface ThreatLevel {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  reasons: string[];
}

export interface AttackPattern {
  type: AttackType;
  frequency: number;
  timeRange: TimeRange;
  sourceIps: string[];
}

/**
 * Security analysis service for client-side analysis of security events.
 * Note: For dashboard statistics, prefer using pre-aggregated data from backend
 * to avoid fetching large amounts of individual events.
 */
export class SecurityAnalysisService {
  // Helper functions for SecurityEvent interface
  private isAttack(event: SecurityEvent): boolean {
    return event.attackType !== undefined;
  }

  private isCritical(event: SecurityEvent): boolean {
    return event.severity === SeverityLevel.CRITICAL;
  }

  private getSeverityScore(event: SecurityEvent): number {
    const scores = {
      [SeverityLevel.LOW]: 1,
      [SeverityLevel.MEDIUM]: 2,
      [SeverityLevel.HIGH]: 3,
      [SeverityLevel.CRITICAL]: 4
    };
    return scores[event.severity];
  }
  
  /**
   * Analyze threat level from individual events.
   * @deprecated Use backend aggregated statistics for better performance
   */
  analyzeThreatLevel(events: SecurityEvent[]): ThreatLevel {
    if (events.length === 0) {
      return { level: 'low', score: 0, reasons: [] };
    }

    const reasons: string[] = [];
    let score = 0;

    // Check attack frequency
    const attackCount = events.filter(e => this.isAttack(e)).length;
    const attackRate = attackCount / events.length;
    
    if (attackRate > 0.5) {
      score += 40;
      reasons.push('High attack rate detected');
    } else if (attackRate > 0.2) {
      score += 20;
      reasons.push('Moderate attack rate');
    }

    // Check critical events
    const criticalCount = events.filter(e => this.isCritical(e)).length;
    if (criticalCount > 0) {
      score += criticalCount * 10;
      reasons.push(`${criticalCount} critical events detected`);
    }

    // Check blocked rate
    const blockedCount = events.filter(e => e.blocked).length;
    const blockRate = blockedCount / events.length;
    if (blockRate > 0.7) {
      score += 30;
      reasons.push('High block rate indicates active threats');
    }

    // Determine level based on score
    let level: ThreatLevel['level'];
    if (score >= 70) level = 'critical';
    else if (score >= 50) level = 'high';
    else if (score >= 30) level = 'medium';
    else level = 'low';

    return { level, score, reasons };
  }

  detectAttackPatterns(events: SecurityEvent[]): AttackPattern[] {
    const patterns = new Map<AttackType, AttackPattern>();

    events
      .filter(e => e.attackType)
      .forEach(event => {
        const type = event.attackType!;
        
        if (!patterns.has(type)) {
          patterns.set(type, {
            type,
            frequency: 0,
            timeRange: new TimeRange(event.timestamp, event.timestamp),
            sourceIps: []
          });
        }

        const pattern = patterns.get(type)!;
        pattern.frequency++;
        
        if (!pattern.sourceIps.includes(event.sourceIp)) {
          pattern.sourceIps.push(event.sourceIp);
        }

        // Update time range
        if (event.timestamp < pattern.timeRange.startDate) {
          pattern.timeRange = new TimeRange(event.timestamp, pattern.timeRange.endDate);
        }
        if (event.timestamp > pattern.timeRange.endDate) {
          pattern.timeRange = new TimeRange(pattern.timeRange.startDate, event.timestamp);
        }
      });

    return Array.from(patterns.values())
      .sort((a, b) => b.frequency - a.frequency);
  }

  identifySuspiciousIps(events: SecurityEvent[]): Array<{ ip: string; threatScore: number; attackTypes: AttackType[] }> {
    const ipStats = new Map<string, { 
      attackCount: number; 
      totalCount: number; 
      attackTypes: Set<AttackType>;
      blockedCount: number;
    }>();

    events.forEach(event => {
      if (!ipStats.has(event.sourceIp)) {
        ipStats.set(event.sourceIp, {
          attackCount: 0,
          totalCount: 0,
          attackTypes: new Set(),
          blockedCount: 0
        });
      }

      const stats = ipStats.get(event.sourceIp)!;
      stats.totalCount++;
      
      if (this.isAttack(event)) {
        stats.attackCount++;
        if (event.attackType) {
          stats.attackTypes.add(event.attackType);
        }
      }
      
      if (event.blocked) {
        stats.blockedCount++;
      }
    });

    return Array.from(ipStats.entries())
      .map(([ip, stats]) => {
        // Calculate threat score for IP
        let threatScore = 0;
        
        // Attack rate factor
        const attackRate = stats.attackCount / stats.totalCount;
        threatScore += attackRate * 40;
        
        // Attack diversity factor
        threatScore += stats.attackTypes.size * 10;
        
        // Block rate factor
        const blockRate = stats.blockedCount / stats.totalCount;
        threatScore += blockRate * 30;
        
        // Volume factor
        if (stats.totalCount > 100) threatScore += 20;
        else if (stats.totalCount > 50) threatScore += 10;

        return {
          ip,
          threatScore: Math.min(100, threatScore),
          attackTypes: Array.from(stats.attackTypes)
        };
      })
      .filter(item => item.threatScore > 30)
      .sort((a, b) => b.threatScore - a.threatScore);
  }

  /**
   * Calculate risk score from individual events.
   * @deprecated Use backend aggregated statistics for better performance
   */
  calculateRiskScore(events: SecurityEvent[]): number {
    if (events.length === 0) return 0;

    let totalScore = 0;
    
    events.forEach(event => {
      let eventScore = this.getSeverityScore(event) * 10;
      
      if (this.isAttack(event)) eventScore *= 1.5;
      if (event.blocked) eventScore *= 0.7; // Lower risk if blocked
      
      totalScore += eventScore;
    });

    return Math.min(100, totalScore / events.length);
  }
}