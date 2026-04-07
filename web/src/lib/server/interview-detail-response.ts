import type { Interview as InterviewRow } from "@prisma/client";

import type { InterviewDto } from "@/types/interview";
import type { InterviewStatus } from "@/types/conversation";

/**
 * Maps a Prisma interview row to the canonical API DTO (ISO dates, parsed JSON fields).
 * Use `audioUrl` from `refreshInterviewAudioUrlFromAgent` when available.
 */
export function interviewRowToDetailDto(
  row: InterviewRow,
  audioUrl: string | null | undefined,
): InterviewDto {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    status: row.status as InterviewStatus,
    config: row.config ? JSON.parse(row.config) : null,
    transcript: JSON.parse(row.transcript),
    processedTranscript: row.processedTranscript
      ? JSON.parse(row.processedTranscript)
      : [],
    audioUrl: audioUrl ?? row.audioUrl,
    questions: row.questions ? JSON.parse(row.questions) : [],
  };
}
