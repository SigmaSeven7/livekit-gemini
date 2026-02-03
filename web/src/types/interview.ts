import { InterviewStatus, ConversationMessage } from "./conversation";

/**
 * Interview type matching the Prisma schema.
 * Represents a parsed/serialized interview where:
 * - Dates are serialized as ISO strings
 * - Config is parsed from JSON string to object
 * - Transcript is parsed from JSON string to ConversationMessage array
 */
export interface Interview {
  /** Unique identifier (UUID) */
  id: string;
  /** Creation timestamp as ISO string */
  createdAt: string;
  /** Last update timestamp as ISO string */
  updatedAt: string;
  /** Interview status: in_progress | completed | paused */
  status: InterviewStatus;
  /** Parsed interview configuration (null if not set) */
  config: Record<string, unknown> | null;
  /** Array of conversation messages (parsed from transcript JSON) */
  transcript: ConversationMessage[];
}