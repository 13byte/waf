// Dashboard data use case
import { ISecurityEventRepository } from '../../../domain/repositories/ISecurityEventRepository';
import { SecurityAnalysisService } from '../../../domain/services/SecurityAnalysisService';
import { TimeRange } from '../../../domain/value-objects/TimeRange';

export interface DashboardData {
  stats: {
    totalRequests: number;
    blockedRequests: number;
    attackRequests: number;
    blockRate: number;
  };
  threatLevel: {
    level: string;
    score: number;
    reasons: string[];
  };
  recentEvents: Array<{
    id: string;
    timestamp: Date;
    sourceIp: string;
    attackType?: string;
    blocked: boolean;
  }>;
  topAttackTypes: Array<{ type: string; count: number }>;
  topSourceIps: Array<{ ip: string; count: number }>;
  riskScore: number;
  systemHealth?: number;
  avgResponseTime?: number;
  changes?: {
    total_requests_change: number;
    blocked_requests_change: number;
    attack_requests_change: number;
  };
  hourlyTrends?: Array<{
    label: string;
    total: number;
    blocked: number;
    attacks: number;
  }>;
}

export class GetDashboardDataUseCase {
  constructor(
    private securityEventRepo: ISecurityEventRepository,
    private securityAnalysisService: SecurityAnalysisService
  ) {}

  private calculateThreatLevelFromStats(stats: any): string {
    const attackRate = stats.totalEvents > 0 ? (stats.attackEvents / stats.totalEvents) * 100 : 0;
    if (attackRate > 50) return 'CRITICAL';
    if (attackRate > 30) return 'HIGH';
    if (attackRate > 10) return 'MEDIUM';
    return 'LOW';
  }

  private generateThreatReasons(stats: any): string[] {
    const reasons = [];
    const attackRate = stats.totalEvents > 0 ? (stats.attackEvents / stats.totalEvents) * 100 : 0;
    
    if (attackRate > 30) {
      reasons.push(`High attack rate: ${attackRate.toFixed(1)}%`);
    }
    if (stats.blockRate > 20) {
      reasons.push(`Elevated block rate: ${stats.blockRate.toFixed(1)}%`);
    }
    if (stats.topAttackTypes?.length > 3) {
      reasons.push(`Multiple attack types detected: ${stats.topAttackTypes.length}`);
    }
    
    return reasons.length > 0 ? reasons : ['Normal traffic patterns'];
  }

  private calculateSimpleRiskScore(stats: any): number {
    const attackRate = stats.totalEvents > 0 ? (stats.attackEvents / stats.totalEvents) * 100 : 0;
    const blockRate = stats.blockRate || 0;
    
    // Simple weighted average
    return Math.min(100, Math.round((attackRate * 0.6) + (blockRate * 0.4)));
  }

  async execute(timeRange?: TimeRange): Promise<DashboardData> {
    // Get aggregated stats directly from backend - no need to fetch individual events
    const stats = await this.securityEventRepo.getStats(timeRange);
    
    // Get recent events for display only
    const recentEvents = await this.securityEventRepo.getRecentEvents(10);
    
    // Use pre-calculated threat level and risk score from stats
    // Backend should provide these based on DB aggregation
    const threatLevel = {
      level: this.calculateThreatLevelFromStats(stats),
      score: stats.blockRate || 0,
      reasons: this.generateThreatReasons(stats)
    };
    
    // Risk score should come from backend stats
    const riskScore = this.calculateSimpleRiskScore(stats);
    
    return {
      stats: {
        totalRequests: stats.totalEvents || 0,
        blockedRequests: stats.blockedEvents || 0,
        attackRequests: stats.attackEvents || 0,
        blockRate: stats.blockRate || 0
      },
      threatLevel,
      recentEvents: recentEvents.map(e => ({
        id: e.id,
        timestamp: e.timestamp,
        sourceIp: e.sourceIp,
        attackType: e.attackType,
        blocked: e.blocked
      })),
      topAttackTypes: stats.topAttackTypes || [],
      topSourceIps: stats.topSourceIps || [],
      riskScore,
      systemHealth: stats.system_health,
      avgResponseTime: stats.avg_response_time,
      changes: stats.changes,
      hourlyTrends: stats.hourly_trends
    };
  }
}