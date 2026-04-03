/** Use for guarding `window` / `document` in shared modules (SSR-safe). */
export const isBrowser =
  typeof globalThis !== "undefined" &&
  typeof (globalThis as unknown as { window?: unknown }).window !== "undefined";
