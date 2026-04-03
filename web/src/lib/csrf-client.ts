/**
 * Browser helpers for CSRF — use only in client code (fetch wrappers, useEffect).
 */

import { CSRF_HEADER_NAME } from "@/lib/csrf-constants";

let cachedToken: string | null = null;
let inflight: Promise<string | null> | null = null;

/** Fetches CSRF token (sets cookie) and returns token for the X-CSRF-Token header. */
export async function ensureCsrfToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  if (cachedToken) return cachedToken;
  if (!inflight) {
    inflight = fetch("/api/csrf-token", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { token?: string } | null) => {
        const t = j?.token ?? null;
        cachedToken = t;
        return t;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function csrfHeaderName(): string {
  return CSRF_HEADER_NAME;
}

/** Merge CSRF header into init for mutating requests. */
export async function withCsrf(init: RequestInit = {}): Promise<RequestInit> {
  const token = await ensureCsrfToken();
  if (!token) return init;
  const headers = new Headers(init.headers);
  headers.set(csrfHeaderName(), token);
  return { ...init, headers };
}
