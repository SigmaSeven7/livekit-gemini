/**
 * Parent origin for postMessage target and `message` event validation.
 * Must match IFRAME_PARENT_ORIGIN used for CSP (without path).
 */
export function getParentOrigin(): string | null {
  if (typeof import.meta.env.VITE_PUBLIC_PARENT_ORIGIN === "string") {
    const o = import.meta.env.VITE_PUBLIC_PARENT_ORIGIN.trim();
    return o.length > 0 ? o : null;
  }
  return null;
}
