/**
 * Interview completion stores R2 presigned URLs from the agent audio server.
 * Those URLs expire quickly (see audio_server.py); the DB keeps the stale string.
 * Browsers then load XML/JSON error bodies as "audio" → MEDIA_ERR_SRC_NOT_SUPPORTED / format error.
 *
 * When serving an interview, refresh the URL by asking the agent for a new presigned link.
 */

const DEFAULT_AUDIO_SERVER = "http://localhost:3001";

function isLikelyPresignedS3StyleUrl(url: string): boolean {
  return (
    url.includes("X-Amz-Algorithm") ||
    url.includes("X-Amz-Signature") ||
    url.includes("X-Amz-Credential") ||
    url.includes("X-Amz-Expires")
  );
}

/** True when the stored URL is probably an expiring remote object URL we can refresh from the agent. */
export function shouldRefreshStoredAudioUrl(url: string | null): boolean {
  if (!url) return false;
  if (url.startsWith("/api/audio")) return false;
  if (url.includes("/api/audio/files")) return false;
  if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
  return isLikelyPresignedS3StyleUrl(url);
}

export async function refreshInterviewAudioUrlFromAgent(
  interviewId: string,
  storedUrl: string | null,
): Promise<string | null> {
  if (!shouldRefreshStoredAudioUrl(storedUrl)) {
    return storedUrl;
  }

  const base =
    typeof process !== "undefined" && process.env.AUDIO_SERVER_URL
      ? process.env.AUDIO_SERVER_URL
      : DEFAULT_AUDIO_SERVER;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(
      `${base.replace(/\/$/, "")}/getAudioFile?id=${encodeURIComponent(interviewId)}`,
      { signal: controller.signal },
    );
    if (!res.ok) {
      return storedUrl;
    }
    const data = (await res.json()) as { audioUrl?: string | null };
    return data.audioUrl ?? storedUrl;
  } catch (e) {
    console.warn(
      "[interview-audio-url] Could not refresh presigned audio URL from agent:",
      e,
    );
    return storedUrl;
  } finally {
    clearTimeout(timeout);
  }
}
