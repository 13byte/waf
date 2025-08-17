// WAF configuration repository implementation
import { IWafConfigRepository } from '../../domain/repositories/IWafConfigRepository';
import { WafConfig, WafConfigEntity, CustomRule, RuleAction } from '../../domain/entities/WafConfig';
import { ApiClient } from '../api/ApiClient';

interface ApiWafConfig {
  id: string;
  paranoia_level: number;
  rule_engine: boolean;
  audit_engine: boolean;
  anomaly_threshold: number;
  blocked_ips: string[];
  allowed_ips: string[];
  custom_rules: Array<{
    id: string;
    name: string;
    pattern: string;
    action: string;
    enabled: boolean;
    priority: number;
  }>;
  updated_at: string;
  updated_by: string;
}

export class WafConfigRepository implements IWafConfigRepository {
  constructor(private apiClient: ApiClient) {}

  private mapApiToEntity(apiConfig: ApiWafConfig): WafConfig {
    return new WafConfigEntity(
      apiConfig.id,
      apiConfig.paranoia_level,
      apiConfig.rule_engine,
      apiConfig.audit_engine,
      apiConfig.anomaly_threshold,
      apiConfig.blocked_ips,
      apiConfig.allowed_ips,
      apiConfig.custom_rules.map(rule => ({
        id: rule.id,
        name: rule.name,
        pattern: rule.pattern,
        action: rule.action as RuleAction,
        enabled: rule.enabled,
        priority: rule.priority
      })),
      new Date(apiConfig.updated_at),
      apiConfig.updated_by
    );
  }

  async getConfig(): Promise<WafConfig> {
    const response = await this.apiClient.get<ApiWafConfig>('/waf/config');
    return this.mapApiToEntity(response);
  }

  async updateConfig(config: Partial<WafConfig>): Promise<WafConfig> {
    const apiConfig: any = {};
    
    if (config.paranoiaLevel !== undefined) apiConfig.paranoia_level = config.paranoiaLevel;
    if (config.ruleEngine !== undefined) apiConfig.rule_engine = config.ruleEngine;
    if (config.auditEngine !== undefined) apiConfig.audit_engine = config.auditEngine;
    if (config.anomalyThreshold !== undefined) apiConfig.anomaly_threshold = config.anomalyThreshold;
    
    const response = await this.apiClient.put<ApiWafConfig>('/waf/config', apiConfig);
    return this.mapApiToEntity(response);
  }

  async addCustomRule(rule: CustomRule): Promise<void> {
    await this.apiClient.post('/waf/config/rules', {
      name: rule.name,
      pattern: rule.pattern,
      action: rule.action,
      enabled: rule.enabled,
      priority: rule.priority
    });
  }

  async updateCustomRule(ruleId: string, rule: Partial<CustomRule>): Promise<void> {
    await this.apiClient.put(`/waf/config/rules/${ruleId}`, rule);
  }

  async deleteCustomRule(ruleId: string): Promise<void> {
    await this.apiClient.delete(`/waf/config/rules/${ruleId}`);
  }

  async addBlockedIp(ip: string): Promise<void> {
    await this.apiClient.post('/waf/config/blocked-ips', { ip });
  }

  async removeBlockedIp(ip: string): Promise<void> {
    await this.apiClient.delete(`/waf/config/blocked-ips/${ip}`);
  }

  async addAllowedIp(ip: string): Promise<void> {
    await this.apiClient.post('/waf/config/allowed-ips', { ip });
  }

  async removeAllowedIp(ip: string): Promise<void> {
    await this.apiClient.delete(`/waf/config/allowed-ips/${ip}`);
  }
}