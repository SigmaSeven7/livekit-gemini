import { ConversationMessage } from "@/types/conversation";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_LARGE_JOBS_MODEL || "openai/gpt-oss-120b";

if (!GROQ_API_KEY) {
    console.warn("GROQ_API_KEY is not set in environment variables");
}

export interface RawTranscriptSegment {
    transcriptId: string | number;
    interviewId: string;
    participant: string;
    transcript: string;
    timestampStart: number;
    timestampEnd: number;
    wallClockStart?: number;
    audioUrl: string | null;
}

/**
 * Cleans and improves transcripts using Groq API
 * Fixes punctuation, capitalization, and basic grammar while preserving meaning
 */
export async function processTranscriptsWithGroq(
    transcripts: RawTranscriptSegment[]
): Promise<ConversationMessage[]> {
    if (!GROQ_API_KEY) {
        console.warn("GROQ_API_KEY not configured, returning raw transcripts");
        return transcripts.map(t => ({
            transcriptId: String(t.transcriptId),
            interviewId: t.interviewId,
            participant: (t.participant === "candidate" ? "user" : t.participant) as "user" | "agent",
            transcript: t.transcript,
            timestampStart: t.timestampStart,
            timestampEnd: t.timestampEnd,
            wallClockStart: t.wallClockStart,
            audioUrl: t.audioUrl,
            audioBase64: null,
        }));
    }

    if (transcripts.length === 0) {
        return [];
    }

    const systemPrompt = `You are a transcript cleaning assistant. Your ONLY task is to add punctuation and fix obvious typos in raw interview transcripts.

PROCESSING INSTRUCTIONS:
1. First, read through ALL transcripts to understand the overall context (topic, subject matter, technical terms used, names mentioned, etc.)
2. Then, examine each transcript segment individually to determine what modifications it needs
3. Use the overall context to make better, more accurate modifications

CRITICAL RULES:
1. You will receive a JSON object where KEYS are transcript IDs (DO NOT CHANGE THESE KEYS)
2. Values are the transcript texts - only modify the VALUES, never the keys
3. NEVER change the meaning or wording of what was said - keep the speaker's exact words
4. NEVER add or remove words
5. NEVER change grammar that doesn't affect readability
6. ONLY add punctuation (periods, commas, question marks, exclamation marks) where clearly needed
7. ONLY fix obvious typos that are clear misspellings (e.g., "skool" -> "school", "teh" -> "the")
8. Keep filler words, incomplete sentences, and informal speech as-is
9. Preserve technical terms, names, code snippets exactly as-is
10. If you're unsure whether something is a typo, leave it as-is

Examples of what to do:
- {"1": "im go to school"} -> {"1": "I'm go to school."}
- {"2": "hello how are you"} -> {"2": "Hello, how are you?"}
- {"3": "teh book is good"} -> {"3": "the book is good"} (obvious typo)

Examples of what NOT to do:
- {"1": "I'm go to school"} -> {"1": "I'm going to school"} (changed wording)
- {"2": "uh let me think"} -> {"2": "Let me think"} (removed filler word)

Return the SAME JSON object with modified values only. Keep all keys exactly as they were.`;

    // Send minimal data: only transcriptId as key and transcript text as value
    const transcriptMap: Record<string, string> = {};
    transcripts.forEach(t => {
        transcriptMap[String(t.transcriptId)] = t.transcript;
    });

    const userPrompt = `Clean the following ${transcripts.length} transcript segments from this interview:

${JSON.stringify(transcriptMap, null, 2)}

Return the same JSON object with the keys unchanged and only the values (transcript texts) modified as needed.`;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                response_format: { type: "json_object" },
                temperature: 0.1,
                max_tokens: 8092,
                top_p: 1,
                reasoning_effort: "low",
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Groq API error during transcript processing:", errorText);
            throw new Error(`Groq API failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) {
            throw new Error("No content received from Groq API");
        }

        const parsed = JSON.parse(content);

        // The response is now a JSON object with transcriptId keys and cleaned transcript values
        // Map back to the original format
        const cleanedMap: Record<string, string> = parsed;
        
        // Build the result by mapping cleaned transcripts back to original structure
        return transcripts.map(t => {
            const transcriptId = String(t.transcriptId);
            const cleanedText = cleanedMap[transcriptId] || t.transcript;
            return {
                transcriptId,
                interviewId: t.interviewId,
                participant: (t.participant === "candidate" ? "user" : t.participant) as "user" | "agent",
                transcript: cleanedText,
                timestampStart: t.timestampStart,
                timestampEnd: t.timestampEnd,
                wallClockStart: t.wallClockStart,
                audioUrl: t.audioUrl,
                audioBase64: null,
            };
        });

    } catch (error) {
        console.error("Transcript processing failed:", error);
        return transcripts.map(t => ({
            transcriptId: String(t.transcriptId),
            interviewId: t.interviewId,
            participant: (t.participant === "candidate" ? "user" : t.participant) as "user" | "agent",
            transcript: t.transcript,
            timestampStart: t.timestampStart,
            timestampEnd: t.timestampEnd,
            wallClockStart: t.wallClockStart,
            audioUrl: t.audioUrl,
            audioBase64: null,
        }));
    }
}
