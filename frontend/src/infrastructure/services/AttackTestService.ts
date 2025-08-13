// Attack test service implementation
import { IAttackTestService, AttackTestParams, AttackTestResult } from '../../application/use-cases/attack-testing/RunAttackTestUseCase';
import { AttackType } from '../../domain/entities/SecurityEvent';
import { ApiClient } from '../api/ApiClient';

export class AttackTestService implements IAttackTestService {
  constructor(private apiClient: ApiClient) {}

  async runTest(params: AttackTestParams): Promise<AttackTestResult> {
    const endpoint = this.getEndpointForAttackType(params.type);
    
    try {
      const response = await this.apiClient.get<any>(endpoint, {
        payload: params.payload,
        target: params.target
      });
      
      return {
        success: true,
        blocked: false,
        response: {
          statusCode: 200,
          body: response,
          headers: {}
        },
        wafResponse: {
          detected: false,
          ruleIds: [],
          anomalyScore: 0
        }
      };
    } catch (error: any) {
      // Check if blocked by WAF
      const isBlocked = error.message.includes('403');
      
      return {
        success: false,
        blocked: isBlocked,
        response: {
          statusCode: isBlocked ? 403 : 500,
          body: { error: error.message },
          headers: {}
        },
        wafResponse: {
          detected: isBlocked,
          ruleIds: [],
          anomalyScore: isBlocked ? 5 : 0
        }
      };
    }
  }

  private getEndpointForAttackType(type: AttackType): string {
    const endpoints: Record<AttackType, string> = {
      [AttackType.XSS]: '/vulnerable/xss',
      [AttackType.SQL_INJECTION]: '/vulnerable/sqli',
      [AttackType.PATH_TRAVERSAL]: '/vulnerable/path-traversal',
      [AttackType.COMMAND_INJECTION]: '/vulnerable/command-injection',
      [AttackType.REMOTE_FILE_INCLUSION]: '/vulnerable/rfi',
      [AttackType.PHP_INJECTION]: '/vulnerable/php',
      [AttackType.SCANNER]: '/vulnerable/scanner',
      [AttackType.PROTOCOL_VIOLATION]: '/vulnerable/protocol'
    };
    
    return endpoints[type] || '/vulnerable/test';
  }
}