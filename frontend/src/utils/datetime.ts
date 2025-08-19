/**
 * DateTime utility functions for KST timezone handling
 */

/**
 * Format date to KST ISO string with timezone offset
 */
export const toKSTISOString = (date: Date): string => {
  // Add 9 hours for KST (UTC+9)
  const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
  return kstDate.toISOString().split('.')[0] + '+09:00';
};

/**
 * Format date to KST locale string
 */
export const toKSTLocaleString = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
};

/**
 * Format date to KST time string
 */
export const toKSTTimeString = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('ko-KR', { 
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

/**
 * Format date to KST date string
 */
export const toKSTDateString = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' });
};

/**
 * Get current KST date
 */
export const getKSTNow = (): Date => {
  return new Date();
};

/**
 * Format relative time (e.g., "5 minutes ago")
 */
export const formatRelativeTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  return `${Math.floor(diff / 86400)} days ago`;
};