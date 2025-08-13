// Run attack test use case
import { AttackType } from '../../../domain/entities/SecurityEvent';

export interface AttackTestParams {
  type: AttackType;
  payload: string;
  target?: string;
}

export interface AttackTestResult {
  success: boolean;
  blocked: boolean;
  response: {
    statusCode: number;
    body: any;
    headers: Record<string, string>;
  };
  wafResponse: {
    detected: boolean;
    ruleIds: string[];
    anomalyScore: number;
  };
}

export interface IAttackTestService {
  runTest(params: AttackTestParams): Promise<AttackTestResult>;
}

export class RunAttackTestUseCase {
  constructor(
    private attackTestService: IAttackTestService
  ) {}

  async execute(params: AttackTestParams): Promise<AttackTestResult> {
    // Validate payload
    if (!params.payload || params.payload.trim() === '') {
      throw new Error('Payload cannot be empty');
    }
    
    // Run the test
    const result = await this.attackTestService.runTest(params);
    
    return result;
  }
}