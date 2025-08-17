// WAF configuration entity
export interface WafConfig {
  id: string;
  paranoiaLevel: number;
  ruleEngine: boolean;
  auditEngine: boolean;
  anomalyThreshold: number;
  blockedIps: string[];
  allowedIps: string[];
  customRules: CustomRule[];
  updatedAt: Date;
  updatedBy: string;
}

export interface CustomRule {
  id: string;
  name: string;
  pattern: string;
  action: RuleAction;
  enabled: boolean;
  priority: number;
}

export enum RuleAction {
  BLOCK = 'block',
  ALLOW = 'allow',
  LOG = 'log',
  REDIRECT = 'redirect'
}

export class WafConfigEntity implements WafConfig {
  constructor(
    public id: string,
    public paranoiaLevel: number,
    public ruleEngine: boolean,
    public auditEngine: boolean,
    public anomalyThreshold: number,
    public blockedIps: string[],
    public allowedIps: string[],
    public customRules: CustomRule[],
    public updatedAt: Date,
    public updatedBy: string
  ) {}

  isHighSecurity(): boolean {
    return this.paranoiaLevel >= 3;
  }

  isIpBlocked(ip: string): boolean {
    return this.blockedIps.includes(ip);
  }

  isIpAllowed(ip: string): boolean {
    return this.allowedIps.includes(ip);
  }

  getActiveRules(): CustomRule[] {
    return this.customRules.filter(rule => rule.enabled);
  }

  validate(): string[] {
    const errors: string[] = [];
    
    if (this.paranoiaLevel < 1 || this.paranoiaLevel > 4) {
      errors.push('Paranoia level must be between 1 and 4');
    }
    
    if (this.anomalyThreshold < 0) {
      errors.push('Anomaly threshold must be positive');
    }
    
    return errors;
  }
}