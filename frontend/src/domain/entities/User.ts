// User entity
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  lastLogin?: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  VIEWER = 'viewer'
}

export class UserEntity implements User {
  constructor(
    public id: string,
    public username: string,
    public email: string,
    public role: UserRole,
    public createdAt: Date,
    public lastLogin?: Date
  ) {}

  canAccessDashboard(): boolean {
    return true;
  }

  canModifyConfig(): boolean {
    return this.role === UserRole.ADMIN;
  }

  canViewLogs(): boolean {
    return true;
  }

  canRunTests(): boolean {
    return this.role === UserRole.ADMIN || this.role === UserRole.OPERATOR;
  }
}