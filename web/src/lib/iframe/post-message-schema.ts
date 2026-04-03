import { z } from "zod";

/** Inbound messages from parent → iframe (extend as needed). */
export const parentToChildMessageSchema = z.object({
  type: z.string(),
  payload: z.unknown().optional(),
});

export type ParentToChildMessage = z.infer<typeof parentToChildMessageSchema>;

/** Outbound messages from iframe → parent. */
export const childToParentMessageSchema = z.object({
  type: z.string(),
  payload: z.unknown().optional(),
});

export type ChildToParentMessage = z.infer<typeof childToParentMessageSchema>;
