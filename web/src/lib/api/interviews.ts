import type { InterviewDto } from "@/types/interview";

function interviewUrl(id: string): string {
  return `/api/interviews/${encodeURIComponent(id)}`;
}

/** GET /api/interviews/:id — canonical interview detail for history and session. */
export async function fetchInterviewDto(id: string): Promise<InterviewDto> {
  const response = await fetch(interviewUrl(id));
  if (!response.ok) {
    throw new Error("Failed to fetch interview");
  }
  return response.json() as Promise<InterviewDto>;
}

/** Used from loaders when `window` is undefined (absolute URL). */
export function interviewDetailRequestUrl(
  id: string,
  origin: string,
): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${interviewUrl(id)}`;
}

export type CreateInterviewPayload = {
  config?: Record<string, unknown>;
  status?: "in_progress" | "completed" | "paused";
  questions?: Array<{
    question: string;
    category: string;
    hints: string[];
  }>;
};

export async function createInterview(
  payload: CreateInterviewPayload,
): Promise<InterviewDto> {
  const response = await fetch("/api/interviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to create interview");
  }
  return response.json() as Promise<InterviewDto>;
}

export async function deleteInterview(id: string): Promise<void> {
  const response = await fetch(interviewUrl(id), { method: "DELETE" });
  if (!response.ok) {
    const errJson = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(errJson?.error || "Failed to delete interview");
  }
}

export async function deleteAllInterviews(): Promise<unknown> {
  const response = await fetch("/api/interviews?confirm=true", {
    method: "DELETE",
  });
  if (!response.ok) {
    const errJson = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(errJson?.error || "Failed to delete all interviews");
  }
  return response.json();
}
