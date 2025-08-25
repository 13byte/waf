// Unified date utility functions

/**
 * Get start of day in local timezone as ISO string
 */
export function getStartOfDay(date: Date | null): string {
  if (!date) return '';
  
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay.toISOString();
}

/**
 * Get end of day in local timezone as ISO string
 */
export function getEndOfDay(date: Date | null): string {
  if (!date) return '';
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay.toISOString();
}

/**
 * Get today's date range
 */
export function getTodayRange(): { startDate: string; endDate: string } {
  const now = new Date();
  return {
    startDate: getStartOfDay(now),
    endDate: getEndOfDay(now)
  };
}

/**
 * Get this week's date range (Monday to Sunday)
 */
export function getThisWeekRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() - daysToMonday);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  return {
    startDate: getStartOfDay(monday),
    endDate: getEndOfDay(sunday)
  };
}

/**
 * Get this month's date range
 */
export function getThisMonthRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  return {
    startDate: getStartOfDay(firstDay),
    endDate: getEndOfDay(lastDay)
  };
}

/**
 * Get date range for last N days
 */
export function getLastNDaysRange(days: number): { startDate: string; endDate: string } {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(now.getDate() - days);
  
  return {
    startDate: getStartOfDay(startDate),
    endDate: getEndOfDay(now)
  };
}

/**
 * Format date to KST ISO string with timezone offset
 */
export function toKSTISOString(date: Date): string {
  const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
  return kstDate.toISOString().split('.')[0] + '+09:00';
}

/**
 * Format date to KST locale string
 */
export function toKSTLocaleString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

/**
 * Format date to KST time string
 */
export function toKSTTimeString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('ko-KR', { 
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Format date to KST date string
 */
export function toKSTDateString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
}

/**
 * Format relative time (e.g., "5 minutes ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Format date time for display
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Get current KST date
 */
export function getKSTNow(): Date {
  return new Date();
}