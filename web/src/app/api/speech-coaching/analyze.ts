import { createFileRoute } from "@tanstack/react-router";
import { SPEECH_COACHING_CONTEXT_MAX_CHARS } from "@/lib/speech-coaching-context";
import { analyzeCoachingWavBytes } from "@/server/speech-coaching-openrouter";

const MAX_BODY_BYTES = 16 * 1024 * 1024;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX_REQUESTS = 24;

const rateBuckets = new Map<string, number[]>();

function rateLimitOk(ip: string): boolean {
  const now = Date.now();
  const windowStart = now - RATE_WINDOW_MS;
  const prev = rateBuckets.get(ip) ?? [];
  const kept = prev.filter((t) => t > windowStart);
  if (kept.length >= RATE_MAX_REQUESTS) {
    rateBuckets.set(ip, kept);
    return false;
  }
  kept.push(now);
  rateBuckets.set(ip, kept);
  return true;
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

function parseWavFromRequest(request: Request, buf: ArrayBuffer): Buffer | null {
  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("multipart/form-data")) {
    return null;
  }
  try {
    const json = JSON.parse(new TextDecoder().decode(buf)) as {
      audio_base64?: string;
    };
    if (typeof json.audio_base64 === "string") {
      return Buffer.from(json.audio_base64, "base64");
    }
  } catch {
    /* fallthrough */
  }
  return Buffer.from(buf);
}

export const Route = createFileRoute("/api/speech-coaching/analyze")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
          return Response.json(
            {
              status: "error",
              message: "OPENROUTER_API_KEY is not configured",
            },
            { status: 500 },
          );
        }

        const ip = getClientIp(request);
        if (!rateLimitOk(ip)) {
          return Response.json(
            { status: "error", message: "Too many requests" },
            { status: 429 },
          );
        }

        const contentLength = request.headers.get("content-length");
        if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
          return Response.json(
            { status: "error", message: "Payload too large" },
            { status: 413 },
          );
        }

        let wav: Buffer;
        let coachingContext: string | undefined;

        const ct = request.headers.get("content-type") ?? "";
        let responseLanguage = "English";
        if (ct.includes("multipart/form-data")) {
          const form = await request.formData();
          const file = form.get("audio") ?? form.get("file");
          const langField = form.get("interview_language");
          if (typeof langField === "string" && langField.trim()) {
            responseLanguage = langField.trim();
          }
          const ctxField = form.get("coaching_context");
          if (typeof ctxField === "string" && ctxField.trim()) {
            coachingContext = ctxField.trim().slice(0, SPEECH_COACHING_CONTEXT_MAX_CHARS);
          }
          if (!file || typeof file === "string") {
            return Response.json(
              {
                status: "error",
                message: "Missing audio file (field: audio or file)",
              },
              { status: 400 },
            );
          }
          const ab = await file.arrayBuffer();
          if (ab.byteLength > MAX_BODY_BYTES) {
            return Response.json(
              { status: "error", message: "Audio too large" },
              { status: 413 },
            );
          }
          wav = Buffer.from(ab);
        } else {
          const buf = await request.arrayBuffer();
          if (buf.byteLength > MAX_BODY_BYTES) {
            return Response.json(
              { status: "error", message: "Payload too large" },
              { status: 413 },
            );
          }
          const parsed = parseWavFromRequest(request, buf);
          if (!parsed) {
            return Response.json(
              {
                status: "error",
                message:
                  "Use multipart/form-data with audio field, or JSON { audio_base64 }",
              },
              { status: 400 },
            );
          }
          wav = parsed;
        }

        if (wav.length < 100) {
          return Response.json(
            { status: "error", message: "Invalid or empty WAV" },
            { status: 400 },
          );
        }

        const result = await analyzeCoachingWavBytes(wav, apiKey, undefined, {
          responseLanguage,
          coachingContext,
        });
        if (result.status === "error") {
          return Response.json(result, { status: 502 });
        }
        return Response.json(result);
      },
    },
  },
});
