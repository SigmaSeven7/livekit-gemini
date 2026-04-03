import { createFileRoute } from "@tanstack/react-router";
import {
  buildCsrfSetCookieHeader,
  createCsrfToken,
  getCsrfHeaderName,
} from "@/lib/csrf";

/**
 * Issue CSRF token (double-submit: same value in cookie + X-CSRF-Token on mutations).
 * Cookie uses SameSite=None; Secure for cross-origin iframe contexts.
 */
export const Route = createFileRoute("/api/csrf-token")({
  server: {
    handlers: {
      GET: async () => {
        const token = createCsrfToken();
        const setCookie = buildCsrfSetCookieHeader(token);
        return Response.json(
          { token, headerName: getCsrfHeaderName() },
          {
            status: 200,
            headers: {
              "Set-Cookie": setCookie,
              "Cache-Control": "no-store",
            },
          },
        );
      },
    },
  },
});
