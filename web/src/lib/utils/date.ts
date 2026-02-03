/**
 * Date formatting utilities with module-level caching
 * Following js-cache-function-results pattern for performance
 */

// Module-level cache for formatted dates
const dateFormatCache = new Map<string, string>();

/**
 * Format date for short display (e.g., "Jan 15, 2024, 2:30 PM")
 * Used in interview cards
 */
export function formatDateShort(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const cacheKey = `short-${dateObj.getTime()}`;
  
  if (dateFormatCache.has(cacheKey)) {
    return dateFormatCache.get(cacheKey)!;
  }
  
  const formatted = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(dateObj);
  
  dateFormatCache.set(cacheKey, formatted);
  return formatted;
}

/**
 * Format date for long display (e.g., "January 15, 2024, 2:30 PM")
 * Used in interview detail pages
 */
export function formatDateLong(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const cacheKey = `long-${dateObj.getTime()}`;
  
  if (dateFormatCache.has(cacheKey)) {
    return dateFormatCache.get(cacheKey)!;
  }
  
  const formatted = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(dateObj);
  
  dateFormatCache.set(cacheKey, formatted);
  return formatted;
}

/**
 * Format timestamp to time-only string (e.g., "2:30:45 PM")
 * Used in message timestamps
 */
export function formatTimeOnly(timestamp: number): string {
  const cacheKey = `time-${timestamp}`;
  
  if (dateFormatCache.has(cacheKey)) {
    return dateFormatCache.get(cacheKey)!;
  }
  
  const date = new Date(timestamp);
  const formatted = date.toLocaleTimeString();
  
  dateFormatCache.set(cacheKey, formatted);
  return formatted;
}
