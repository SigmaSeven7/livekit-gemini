/**
 * Bounded text bundle for speech-coaching API — keeps prompts small and safe to log.
 */

export const SPEECH_COACHING_CONTEXT_MAX_CHARS = 4000;

export interface CoachingSessionStaticContext {
    /** From interview config — e.g. candidate_role */
    candidateRole?: string;
    /** Truncated job_description */
    jobDescriptionSnippet?: string;
    /** Question strings from generated interview.questions (preview only) */
    plannedQuestionsPreview?: readonly string[];
}

function truncate(s: string, max: number): string {
    if (s.length <= max) return s;
    return `${s.slice(0, max - 1)}…`;
}

/**
 * Builds a single context block for the coaching model: role, job excerpt, question bank,
 * and the latest interviewer transcript (best proxy for “current question”).
 */
export function buildSpeechCoachingContextString(
    staticCtx: CoachingSessionStaticContext | undefined,
    lastAgentMessage: string,
): string {
    const lines: string[] = [];

    const role = staticCtx?.candidateRole?.trim();
    if (role) {
        lines.push(`Target role: ${role}`);
    }

    const job = staticCtx?.jobDescriptionSnippet?.trim();
    if (job) {
        lines.push(`Job context (excerpt): ${truncate(job, 450)}`);
    }

    const qs = staticCtx?.plannedQuestionsPreview?.filter(Boolean) ?? [];
    if (qs.length > 0) {
        const preview = qs
            .slice(0, 8)
            .map((q, i) => `${i + 1}. ${truncate(q.trim(), 220)}`)
            .join("\n");
        lines.push(`Planned interview questions (reference; current turn may differ):\n${preview}`);
    }

    const agent = lastAgentMessage.trim();
    if (agent) {
        lines.push(
            `Most recent interviewer message (use to judge relevance of the candidate’s answer):\n${truncate(agent, 1400)}`,
        );
    }

    const combined = lines.join("\n\n");
    return truncate(combined, SPEECH_COACHING_CONTEXT_MAX_CHARS);
}
