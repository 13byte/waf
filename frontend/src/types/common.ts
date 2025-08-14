// Common utility types
export interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
}

export interface UseIntersectionObserverProps {
  threshold?: number;
  root?: Element | null;
  rootMargin?: string;
}

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  change?: number;
  trend?: 'up' | 'down';
}

export interface ThreatLevelIndicatorProps {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  reasons: string[];
}

export interface MetricsCardProps {
  title: string;
  value: string | number;
  icon: any; // LucideIcon type
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: string;
}

export interface ChartContainerProps {
  title: string;
  children: React.ReactNode;
  onExport?: () => void;
  className?: string;
}

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showPageNumbers?: number;
}