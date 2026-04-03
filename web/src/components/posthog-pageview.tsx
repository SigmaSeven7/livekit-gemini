"use client";

import { useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { usePostHog } from "posthog-js/react";

export default function PostHogPageView(): null {
  const location = useLocation();
  const posthog = usePostHog();
  useEffect(() => {
    if (posthog) {
      let url = window.origin + location.pathname;
      if (location.search) {
        url = url + location.search;
      }
      posthog.capture("$pageview", {
        $current_url: url,
      });
      console.log("captured pageview", url);
    }
  }, [location.pathname, location.search, posthog]);

  return null;
}
