/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Parent page origin for postMessage + must match server IFRAME_PARENT_ORIGIN for CSP */
  readonly VITE_PUBLIC_PARENT_ORIGIN?: string;
  /** Base URL for server-side fetch (e.g. loaders) when no `window` — e.g. https://app.example.com */
  readonly VITE_PUBLIC_APP_ORIGIN?: string;
  readonly VITE_PUBLIC_SUPPORT_EMAIL?: string;
  readonly VITE_PUBLIC_COACHING_SOURCE?: string;
  readonly VITE_PUBLIC_POSTHOG_KEY?: string;
  readonly VITE_PUBLIC_POSTHOG_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
