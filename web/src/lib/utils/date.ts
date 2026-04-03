/**
 * Date formatting utilities with module-level caching
 * Following js-cache-function-results pattern for performance
 */

import { getLocale } from "@/paraglide/runtime.js";

// Module-level cache for formatted dates
const dateFormatCache = new Map<string, string>();

function intlLocaleTag(locale: string): string {
  return (
    {
      en: "en-US",
      de: "de-DE",
      ru: "ru-RU",
      ar: "ar",
      he: "he-IL",
    }[locale] ?? "en-US"
  );
}

/**
 * Format date for short display (e.g., "Jan 15, 2024, 2:30 PM")
 * Used in interview cards
 */
export function formatDateShort(
  date: Date | string,
  locale?: string,
): string {
  const loc = intlLocaleTag(locale ?? getLocale());
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const cacheKey = `short-${loc}-${dateObj.getTime()}`;

  if (dateFormatCache.has(cacheKey)) {
    return dateFormatCache.get(cacheKey)!;
  }

  const formatted = new Intl.DateTimeFormat(loc, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(dateObj);

  dateFormatCache.set(cacheKey, formatted);
  return formatted;
}

/**
 * Format date for long display (e.g., "January 15, 2024, 2:30 PM")
 * Used in interview detail pages
 */
export function formatDateLong(date: Date | string, locale?: string): string {
  const loc = intlLocaleTag(locale ?? getLocale());
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const cacheKey = `long-${loc}-${dateObj.getTime()}`;

  if (dateFormatCache.has(cacheKey)) {
    return dateFormatCache.get(cacheKey)!;
  }

  const formatted = new Intl.DateTimeFormat(loc, {
    dateStyle: "long",
    timeStyle: "short",
  }).format(dateObj);

  dateFormatCache.set(cacheKey, formatted);
  return formatted;
}

/**
 * Format a Unix timestamp (ms) as a locale time-of-day string, e.g. "1:47 PM".
 * Used in message bubble timestamps.
 */
export function formatTimeOnly(timestamp: number, locale?: string): string {
  const loc = intlLocaleTag(locale ?? getLocale());
  const cacheKey = `time-${loc}-${timestamp}`;

  if (dateFormatCache.has(cacheKey)) {
    return dateFormatCache.get(cacheKey)!;
  }

  const formatted = new Intl.DateTimeFormat(loc, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));

  dateFormatCache.set(cacheKey, formatted);
  return formatted;
}
