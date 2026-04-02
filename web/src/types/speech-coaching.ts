/** OpenRouter coaching payload (aligned with agent/openrouter_coaching.py). */

export interface CoachingMetrics {
    confidence?: number;
    clarity?: number;
    pacing?: "slow" | "good" | "fast" | string;
}

export interface CoachingDataParsed {
    live_toast?: string;
    metrics?: CoachingMetrics;
    emotions?: { scores?: Record<string, number> };
    internal_summary?: string;
    error?: string;
    raw?: string;
}

export interface SpeechCoachingAnalyzeSuccess {
    toast: string;
    data: CoachingDataParsed;
    status: "success";
    model?: string;
}

export interface SpeechCoachingAnalyzeError {
    status: "error";
    message: string;
}

export type SpeechCoachingAnalyzeResponse =
    | SpeechCoachingAnalyzeSuccess
    | SpeechCoachingAnalyzeError;

/** One item in the live coaching feed (client API or agent byte stream). */
export interface SpeechCoachingEntry {
    id: string;
    at: number;
    source: "client" | "agent";
    toast?: string;
    data?: CoachingDataParsed;
    /** Legacy agent payload if ever present */
    coaching?: {
        tone: string;
        vocabulary: string;
        clarity: string;
        suggestions: string[];
    };
    model?: string;
    error?: string;
}
