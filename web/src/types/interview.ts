import { InterviewStatus, ConversationMessage } from "./conversation";

/**
 * Canonical API/client shape for a single interview (GET /api/interviews/:id).
 * Dates are ISO strings; transcript fields are parsed from DB JSON.
 */
export interface InterviewDto {
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
  /** Groq-processed conversation messages */
  processedTranscript?: ConversationMessage[];
  /** Audio URL from getAudioFile endpoint */
  audioUrl?: string | null;
  /** Number of messages in the conversation (list endpoint only) */
  messageCount?: number;
  /** Generated interview questions */
  questions?: Array<{
    question: string;
    category: string;
    hints: string[];
  }>;
}

/** @deprecated Use `InterviewDto` */
export type Interview = InterviewDto;