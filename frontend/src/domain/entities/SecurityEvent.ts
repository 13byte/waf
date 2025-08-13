// Security event entity
export interface SecurityEvent {
  id: string;
  timestamp: Date;
  sourceIp: string;
  targetUrl: string;
  method: HttpMethod;
  statusCode: number;
  attackType?: AttackType;
  severity: SeverityLevel;
  blocked: boolean;
  ruleIds: string[];
  anomalyScore: number;
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD'
}

export enum AttackType {
  XSS = 'XSS',
  SQL_INJECTION = 'SQLI',
  PATH_TRAVERSAL = 'LFI',
  REMOTE_FILE_INCLUSION = 'RFI',
  COMMAND_INJECTION = 'RCE',
  PHP_INJECTION = 'PHP',
  SCANNER = 'SCANNER',
  PROTOCOL_VIOLATION = 'PROTOCOL'
}

export enum SeverityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export class SecurityEventEntity implements SecurityEvent {
  constructor(
    public id: string,
    public timestamp: Date,
    public sourceIp: string,
    public targetUrl: string,
    public method: HttpMethod,
    public statusCode: number,
    public severity: SeverityLevel,
    public blocked: boolean,
    public ruleIds: string[],
    public anomalyScore: number,
    public attackType?: AttackType
  ) {}

  isAttack(): boolean {
    return this.attackType !== undefined;
  }

  isCritical(): boolean {
    return this.severity === SeverityLevel.CRITICAL;
  }

  isBlocked(): boolean {
    return this.blocked;
  }

  getSeverityScore(): number {
    const scores = {
      [SeverityLevel.LOW]: 1,
      [SeverityLevel.MEDIUM]: 2,
      [SeverityLevel.HIGH]: 3,
      [SeverityLevel.CRITICAL]: 4
    };
    return scores[this.severity];
  }
}