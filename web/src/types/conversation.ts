/**
 * Represents a single message in the interview conversation.
 * Each message contains transcript text and associated audio data.
 */
export interface ConversationMessage {
  /** Unique identifier for this transcript segment (UUID) */
  transcriptId: string;
  /** Unique identifier for the interview session (UUID) */
  interviewId: string;
  /** Who said this message */
  participant: 'user' | 'agent';
  /** The transcribed text content */
  transcript: string;
  /** Unix timestamp in milliseconds when speech started */
  timestampStart: number;
  /** Unix timestamp in milliseconds when speech ended */
  timestampEnd: number;
  /** Base64-encoded WAV audio data. Set to null after upload to storage. */
  audioBase64: string | null;
  /** URL to the stored audio file. Null until audio is uploaded. */
  audioUrl: string | null;
}

/**
 * Request payload for batch uploading audio segments
 */
export interface BatchUploadRequest {
  interviewId: string;
  segments: Array<{
    transcriptId: string;
    audioBase64: string;
  }>;
}

/**
 * Response from batch upload endpoint
 */
export interface BatchUploadResponse {
  /** Map of transcriptId to audioUrl */
  urls: Record<string, string>;
}

/**
 * Interview status
 */
export type InterviewStatus = 'in_progress' | 'completed' | 'paused';

/**
 * Full interview record as stored in the database
 */
export interface InterviewRecord {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: InterviewStatus;
  config: string | null;
  transcript: string; // JSON string of ConversationMessage[]
}

/**
 * Parsed interview with typed transcript
 */
export interface Interview {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  status: InterviewStatus;
  config: Record<string, unknown> | null;
  messages: ConversationMessage[];
}
