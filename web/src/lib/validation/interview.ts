import { z } from "zod";

import type { ConversationMessage, InterviewStatus } from "@/types/conversation";

const interviewStatusSchema = z.enum([
  "in_progress",
  "completed",
  "paused",
]) satisfies z.ZodType<InterviewStatus>;

const conversationMessageSchema: z.ZodType<ConversationMessage> = z.object({
  transcriptId: z.string(),
  interviewId: z.string(),
  participant: z.enum(["user", "agent"]),
  transcript: z.string(),
  timestampStart: z.number(),
  timestampEnd: z.number(),
  wallClockStart: z.number().optional(),
  audioBase64: z.string().nullable(),
  audioUrl: z.string().nullable(),
});

const interviewQuestionSchema = z.object({
  question: z.string(),
  category: z.string(),
  hints: z.array(z.string()),
});

/** POST /api/interviews */
export const createInterviewBodySchema = z.object({
  config: z.record(z.string(), z.unknown()).optional(),
  status: interviewStatusSchema.optional(),
  questions: z.array(interviewQuestionSchema).optional(),
});

export type CreateInterviewBody = z.infer<typeof createInterviewBodySchema>;

/** PUT /api/interviews/:id */
export const updateInterviewBodySchema = z.object({
  status: interviewStatusSchema.optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  messages: z.array(conversationMessageSchema).optional(),
});

export type UpdateInterviewBody = z.infer<typeof updateInterviewBodySchema>;

export function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  return request.json().then(
    (raw) => {
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        return {
          ok: false as const,
          response: Response.json(
            { error: "Invalid request body", issues: parsed.error.flatten() },
            { status: 400 },
          ),
        };
      }
      return { ok: true as const, data: parsed.data };
    },
    () => ({
      ok: false as const,
      response: Response.json({ error: "Invalid JSON in request body" }, {
        status: 400,
      }),
    }),
  );
}
