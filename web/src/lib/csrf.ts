import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/csrf-constants";

function getSecret(): string {
  const s = process.env.CSRF_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("CSRF_SECRET must be set in production");
  }
  return "dev-csrf-secret-change-me-min-16-chars";
}

/** Create a signed CSRF token (opaque string). */
export function createCsrfToken(): string {
  const raw = randomBytes(32).toString("base64url");
  const sig = createHmac("sha256", getSecret()).update(raw).digest("base64url");
  return `${raw}.${sig}`;
}

export function verifyCsrfToken(token: string | null | undefined): boolean {
  if (!token || typeof token !== "string") return false;
  const dot = token.indexOf(".");
  if (dot < 1) return false;
  const raw = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", getSecret()).update(raw).digest("base64url");
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * Cross-site cookies need SameSite=None; Secure. Use this when setting session/auth cookies.
 */
export function crossSiteCookieAttrs(): string {
  return "SameSite=None; Secure; Path=/";
}

/**
 * Build Set-Cookie for the CSRF double-submit cookie (not HttpOnly — must be readable by JS for header).
 * Prefer HttpOnly session + separate CSRF token endpoint for stricter setups.
 */
export function buildCsrfSetCookieHeader(token: string): string {
  const maxAge = 60 * 60 * 12;
  return `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}; ${crossSiteCookieAttrs()}; Max-Age=${maxAge}`;
}

export function readCsrfFromCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const m = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]+)`),
  );
  return m ? decodeURIComponent(m[1]) : null;
}

export function getCsrfHeaderName(): string {
  return CSRF_HEADER_NAME;
}

/**
 * Validate CSRF for mutating requests: header must match cookie token.
 */
export function validateCsrf(request: Request): { ok: true } | { ok: false; response: Response } {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return { ok: true };
  }

  const cookie = readCsrfFromCookie(request.headers.get("cookie"));
  const header = request.headers.get(CSRF_HEADER_NAME);
  if (!cookie || !header || !verifyCsrfToken(cookie) || cookie !== header) {
    return {
      ok: false,
      response: Response.json(
        { error: "Invalid or missing CSRF token" },
        { status: 403 },
      ),
    };
  }
  return { ok: true };
}
