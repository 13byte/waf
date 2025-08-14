// Navigation related types
export interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

export interface Notification {
  id: string;
  type: 'attack' | 'blocked' | 'critical' | 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  eventId?: string;
  data?: any;
}