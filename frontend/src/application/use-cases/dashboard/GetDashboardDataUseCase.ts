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
}

export class GetDashboardDataUseCase {
  constructor(
    private securityEventRepo: ISecurityEventRepository,
    private securityAnalysisService: SecurityAnalysisService
  ) {}

  async execute(timeRange?: TimeRange): Promise<DashboardData> {
    // Get stats
    const stats = await this.securityEventRepo.getStats(timeRange);
    
    // Get recent events
    const recentEvents = await this.securityEventRepo.getRecentEvents(10);
    
    // Get all events for analysis
    const { events } = await this.securityEventRepo.getAll(
      timeRange ? { timeRange } : undefined,
      { page: 1, limit: 1000 }
    );
    
    // Analyze threat level
    const threatLevel = this.securityAnalysisService.analyzeThreatLevel(events);
    
    // Calculate risk score
    const riskScore = this.securityAnalysisService.calculateRiskScore(events);
    
    return {
      stats: {
        totalRequests: stats.totalEvents,
        blockedRequests: stats.blockedEvents,
        attackRequests: stats.attackEvents,
        blockRate: stats.blockRate
      },
      threatLevel,
      recentEvents: recentEvents.map(e => ({
        id: e.id,
        timestamp: e.timestamp,
        sourceIp: e.sourceIp,
        attackType: e.attackType,
        blocked: e.blocked
      })),
      topAttackTypes: stats.topAttackTypes,
      topSourceIps: stats.topSourceIps,
      riskScore
    };
  }
}