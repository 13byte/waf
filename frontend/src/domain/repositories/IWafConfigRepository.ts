// WAF configuration repository interface
import { WafConfig, CustomRule } from '../entities/WafConfig';

export interface IWafConfigRepository {
  getConfig(): Promise<WafConfig>;
  
  updateConfig(config: Partial<WafConfig>): Promise<WafConfig>;
  
  addCustomRule(rule: CustomRule): Promise<void>;
  
  updateCustomRule(ruleId: string, rule: Partial<CustomRule>): Promise<void>;
  
  deleteCustomRule(ruleId: string): Promise<void>;
  
  addBlockedIp(ip: string): Promise<void>;
  
  removeBlockedIp(ip: string): Promise<void>;
  
  addAllowedIp(ip: string): Promise<void>;
  
  removeAllowedIp(ip: string): Promise<void>;
}