// Update WAF configuration use case
import { IWafConfigRepository } from '../../../domain/repositories/IWafConfigRepository';
import { WafConfig } from '../../../domain/entities/WafConfig';

export interface UpdateWafConfigParams {
  paranoiaLevel?: number;
  ruleEngine?: boolean;
  auditEngine?: boolean;
  anomalyThreshold?: number;
}

export class UpdateWafConfigUseCase {
  constructor(
    private wafConfigRepo: IWafConfigRepository
  ) {}

  async execute(params: UpdateWafConfigParams): Promise<WafConfig> {
    // Validate paranoia level
    if (params.paranoiaLevel !== undefined) {
      if (params.paranoiaLevel < 1 || params.paranoiaLevel > 4) {
        throw new Error('Paranoia level must be between 1 and 4');
      }
    }
    
    // Validate anomaly threshold
    if (params.anomalyThreshold !== undefined) {
      if (params.anomalyThreshold < 0) {
        throw new Error('Anomaly threshold must be positive');
      }
    }
    
    // Update config
    const updatedConfig = await this.wafConfigRepo.updateConfig(params);
    
    return updatedConfig;
  }
}