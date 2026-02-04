/**
 * Content Hash Utility
 * 
 * Generates unique hashes for message deduplication.
 * Used to prevent duplicate messages from being stored when
 * multiple finalize events trigger for the same segment.
 */

import { createHash } from 'crypto';

/**
 * Sanitizes text by removing all non-alphanumeric characters.
 * Preserves letters and numbers from all Unicode scripts:
 * - Basic Latin (a-zA-Z0-9)
 * - Cyrillic (Russian, etc.)
 * - Arabic
 * - Hebrew
 * - Extended Latin, Greek, CJK, etc.
 * 
 * @param text - The text to sanitize
 * @returns Sanitized text with only alphanumeric characters (lowercase)
 */
export function sanitizeText(text: string): string {
  // \p{L} - Any letter from any language
  // \p{N} - Any numeric character
  // The 'u' flag enables Unicode mode
  return text.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
}

/**
 * Generates a content hash for message deduplication.
 * 
 * Algorithm:
 * 1. Sanitize the transcript text (remove non-alphanumeric, lowercase)
 * 2. Combine interviewId and sanitized transcript
 * 3. Generate SHA-256 hash
 * 
 * @param interviewId - The interview ID
 * @param transcript - The message transcript text
 * @returns SHA-256 hash string (hex)
 */
export function generateContentHash(interviewId: string, transcript: string): string {
  const sanitized = sanitizeText(transcript);
  const combined = `${interviewId}:${sanitized}`;
  return createHash('sha256').update(combined).digest('hex');
}
