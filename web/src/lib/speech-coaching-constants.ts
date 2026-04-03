/**
 * Centralized speech-coaching tuning.
 *
 * **Capture (browser):** used by `use-speech-coaching-analysis.ts`.
 *
 * **LLM defaults:** align with `agent/openrouter_coaching.py` (`COACHING_MAX_TOKENS`,
 * `COACHING_TEMPERATURE`, `DEFAULT_COACHING_MODEL`, system prompt body). When you change
 * prompts or model defaults in Python, update `speech-coaching-openrouter.ts` (system prompt
 * string) and this file as needed so the Next.js route and agent do not drift.
 */

/** Browser: min/max clip length, gating, RMS silence detection */
export const SPEECH_COACHING_CAPTURE = {
    MIN_CLIP_SEC: 20,
    MAX_CLIP_SEC: 120,
    COOLDOWN_MS: 45_000,
    SILENCE_END_UTTERANCE_MS: 1500,
    SPEECH_RMS_THRESHOLD: 0.018,
} as const;

/** Shared defaults for OpenRouter coaching (mirror Python `openrouter_coaching.py`) */
export const SPEECH_COACHING_MODEL_DEFAULT = "google/gemini-3.1-flash-lite-preview";

export const SPEECH_COACHING_LLM = {
    MAX_TOKENS: 1024,
    TEMPERATURE: 0.2,
} as const;

/** User text part of the multimodal message (same intent as Python `analyze_coaching_audio`) */
export const SPEECH_COACHING_USER_TEXT = "Quick audit: live feedback and full emotion scores.";
