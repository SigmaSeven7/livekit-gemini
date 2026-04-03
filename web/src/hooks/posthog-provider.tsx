"use client";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_PUBLIC_POSTHOG_HOST;

if (typeof window !== "undefined" && posthogKey && posthogHost) {
  posthog.init(posthogKey, {
    api_host: posthogHost,
    person_profiles: "identified_only",
    capture_pageview: false, // Disable automatic pageview capture, as we capture manually
  });
}

export function PHProvider({ children }: { children: React.ReactNode }) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
