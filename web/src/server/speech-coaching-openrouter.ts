import type { CoachingDataParsed, SpeechCoachingAnalyzeResponse } from "@/types/speech-coaching";

const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1";

export const DEFAULT_COACHING_MODEL = "google/gemini-3.1-flash-lite-preview";

const COACHING_MAX_TOKENS = 1024;
const COACHING_TEMPERATURE = 0.2;

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

const COACHING_SYSTEM_PROMPT = `You are a Real-Time Interview Coach. 
Analyze the audio clip's acoustic features and return a concise JSON audit.

### LIVE FEEDBACK GOAL:
Provide a "live_toast" message (max 10 words) for immediate display to the user.

### OUTPUT STRUCTURE:
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
  "internal_summary": string (1-sentence summary of behavior for aggregation)
}

### EMOTION LIST (MANDATORY):
${EMOTION_DIMENSIONS.join(", ")}
`;

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

export async function analyzeCoachingWavBytes(
    wavBytes: Buffer,
    apiKey: string,
    model?: string,
): Promise<SpeechCoachingAnalyzeResponse> {
    const m = model ?? process.env.OPENROUTER_COACHING_MODEL ?? DEFAULT_COACHING_MODEL;
    const b64 = wavBytes.toString("base64");

    const userContent = [
        { type: "text", text: "Quick audit: live feedback and full emotion scores." },
        {
            type: "input_audio",
            input_audio: { data: b64, format: "wav" },
        },
    ];

    try {
        const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
            method: "POST",
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
                    { role: "system", content: COACHING_SYSTEM_PROMPT },
                    { role: "user", content: userContent },
                ],
                max_tokens: COACHING_MAX_TOKENS,
                temperature: COACHING_TEMPERATURE,
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
        const message = e instanceof Error ? e.message : String(e);
        return { status: "error", message };
    }
}
