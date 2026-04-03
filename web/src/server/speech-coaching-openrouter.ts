/**
 * OpenRouter coaching — **keep in sync** with `agent/openrouter_coaching.py`:
 * - `COACHING_SYSTEM_PROMPT` / emotion list / output JSON shape
 * - `COACHING_MAX_TOKENS`, `COACHING_TEMPERATURE`, default model
 * Python is the other implementation path (LiveKit agent + optional Flask test).
 */

import type { CoachingDataParsed, SpeechCoachingAnalyzeResponse } from "@/types/speech-coaching";
import {
    SPEECH_COACHING_LLM,
    SPEECH_COACHING_MODEL_DEFAULT,
    SPEECH_COACHING_USER_TEXT,
} from "@/lib/speech-coaching-constants";

const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

export const DEFAULT_COACHING_MODEL = SPEECH_COACHING_MODEL_DEFAULT;

function openRouterCoachingFetchTimeoutMs(): number {
    const raw = process.env.OPENROUTER_COACHING_FETCH_TIMEOUT_MS;
    if (raw === undefined || raw === "") return 90_000;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 5_000 ? n : 90_000;
}

const EMOTION_DIMENSIONS = [
    "Admiration",
    "Amusement",
    "Anger",
    "Anxiety",
    "Awkwardness",
    "Boredom",
    "Calmness",
    "Confusion",
    "Disgust",
    "Excitement",
    "Fear",
    "Interest",
    "Joy",
    "Relief",
    "Sadness",
    "Satisfaction",
    "Surprise",
    "Triumph",
    "Vulnerability",
    "Worry",
] as const;

const COACHING_SYSTEM_PROMPT = `You are a Real-Time Interview Coach focused on **how** the candidate speaks, not on repeating what they said.

### DO NOT
- Transcribe, summarize, or quote the candidate's words.
- Copy long phrases from the interview context into your outputs.
- Answer the interview question yourself.

### DO
- Judge **delivery**: confidence, clarity, pacing, emotional tone, relevance to the interview context when provided.
- Give **actionable** feedback: what to adjust in the next 30–60 seconds of speaking.

### LIVE FEEDBACK
- "live_toast": max 10 words, **one concrete tip** (e.g. slow down, breathe, structure first—then detail). Not a recap.

### OUTPUT STRUCTURE (JSON only)
{
  "live_toast": string,
  "metrics": {
    "confidence": float,
    "clarity": float,
    "pacing": "slow|good|fast"
  },
  "emotions": {
    "scores": { "EmotionName": float (0.0 to 1.0) }
  },
  "internal_summary": string
}

### internal_summary
One sentence: **coaching insight** (strength or improvement tied to interview performance)—not a summary of content.

### EMOTION LIST (MANDATORY keys in scores)
${EMOTION_DIMENSIONS.join(", ")}
`;

function coachingSystemPromptWithResponseLanguage(responseLanguage: string): string {
    const lang = (responseLanguage || "English").trim();
    const lower = lang.toLowerCase();
    const block =
        lower === "english"
            ? `### RESPONSE LANGUAGE
Write live_toast and internal_summary in English.`
            : `### RESPONSE LANGUAGE
The interview is conducted in ${lang}. Write live_toast and internal_summary in ${lang}, using the natural script for that language (e.g. Hebrew, Arabic, or Cyrillic).
Keep JSON property names exactly as in the schema. Emotion keys inside emotions.scores must remain exactly the English names from the EMOTION LIST above.`;
    return `${COACHING_SYSTEM_PROMPT}\n\n${block}`;
}

function parseCoachingContent(raw: string): CoachingDataParsed {
    let text = raw.trim();
    if (text.includes("```json")) {
        text = text.split("```json")[1]?.split("```")[0]?.trim() ?? text;
    } else if (text.includes("```")) {
        text = text.split("```")[1]?.split("```")[0]?.trim() ?? text;
    }
    try {
        return JSON.parse(text) as CoachingDataParsed;
    } catch {
        return { error: "parse_failure", raw: text };
    }
}

type MultimodalUserPart =
    | { type: "text"; text: string }
    | { type: "input_audio"; input_audio: { data: string; format: "wav" } };

function buildUserContent(
    b64Audio: string,
    options?: { coachingContext?: string },
): MultimodalUserPart[] {
    const parts: MultimodalUserPart[] = [{ type: "text", text: SPEECH_COACHING_USER_TEXT }];
    const ctx = options?.coachingContext?.trim();
    if (ctx) {
        parts.push({
            type: "text",
            text: `Interview context (use for relevance only; do not paste into outputs):\n${ctx}`,
        });
    }
    parts.push({
        type: "input_audio",
        input_audio: { data: b64Audio, format: "wav" },
    });
    return parts;
}

export type AnalyzeCoachingOptions = {
    responseLanguage?: string;
    coachingContext?: string;
};

export async function analyzeCoachingWavBytes(
    wavBytes: Buffer,
    apiKey: string,
    model?: string,
    options?: AnalyzeCoachingOptions,
): Promise<SpeechCoachingAnalyzeResponse> {
    const m = model ?? process.env.OPENROUTER_COACHING_MODEL ?? DEFAULT_COACHING_MODEL;
    const responseLanguage = options?.responseLanguage?.trim() || "English";
    const systemContent = coachingSystemPromptWithResponseLanguage(responseLanguage);
    const b64 = wavBytes.toString("base64");

    const userContent = buildUserContent(b64, {
        coachingContext: options?.coachingContext,
    });

    const controller = new AbortController();
    const timeoutMs = openRouterCoachingFetchTimeoutMs();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
            method: "POST",
            signal: controller.signal,
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
                ...(process.env.OPENROUTER_HTTP_REFERER
                    ? { Referer: process.env.OPENROUTER_HTTP_REFERER }
                    : {}),
                ...(process.env.OPENROUTER_X_TITLE ? { "X-Title": process.env.OPENROUTER_X_TITLE } : {}),
            },
            body: JSON.stringify({
                model: m,
                messages: [
                    { role: "system", content: systemContent },
                    { role: "user", content: userContent },
                ],
                max_tokens: SPEECH_COACHING_LLM.MAX_TOKENS,
                temperature: SPEECH_COACHING_LLM.TEMPERATURE,
            }),
        });

        if (!res.ok) {
            const errText = await res.text().catch(() => "");
            return { status: "error", message: `OpenRouter ${res.status}: ${errText.slice(0, 500)}` };
        }

        const json = (await res.json()) as {
            choices?: Array<{ message?: { content?: string | null } }>;
            model?: string;
        };
        const textResponse = json.choices?.[0]?.message?.content ?? "";
        const parsed = parseCoachingContent(textResponse);

        return {
            toast: typeof parsed.live_toast === "string" ? parsed.live_toast : "",
            data: parsed,
            status: "success",
            model: json.model,
        };
    } catch (e) {
        const message =
            e instanceof Error
                ? e.name === "AbortError"
                    ? `OpenRouter request timed out after ${timeoutMs}ms`
                    : e.message
                : String(e);
        return { status: "error", message };
    } finally {
        clearTimeout(timeoutId);
    }
}
