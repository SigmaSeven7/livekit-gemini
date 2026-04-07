import type { InterviewConfig } from "@/data/interview-options";

export async function generateInterviewQuestions(
  config: Partial<InterviewConfig>,
): Promise<
  Array<{ question: string; category: string; hints: string[] }>
> {
  const response = await fetch("/api/questions/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config }),
  });
  if (!response.ok) {
    throw new Error("Failed to generate interview questions");
  }
  const data = (await response.json()) as { questions?: unknown };
  const raw = data.questions;
  if (!Array.isArray(raw)) return [];
  return raw as Array<{ question: string; category: string; hints: string[] }>;
}
