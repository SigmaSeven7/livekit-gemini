"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef } from "react";
import { getParentOrigin } from "@/lib/iframe/config";
import { ensureCsrfToken } from "@/lib/csrf-client";
import {
  childToParentMessageSchema,
  parentToChildMessageSchema,
  type ChildToParentMessage,
  type ParentToChildMessage,
} from "@/lib/iframe/post-message-schema";

export type ParentMessageHandler = (message: ParentToChildMessage) => void;

/**
 * Listens for postMessage from the parent window (strict origin check) and
 * optionally syncs into React Query. Outbound: use `postToParent()` — never use `*` target.
 */
export function IframeBridgeProvider({
  children,
  onParentMessage,
}: {
  children: ReactNode;
  onParentMessage?: ParentMessageHandler;
}) {
  const queryClient = useQueryClient();
  const onParentMessageRef = useRef(onParentMessage);
  onParentMessageRef.current = onParentMessage;

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      const allowed = getParentOrigin();
      if (!allowed || event.origin !== allowed) {
        return;
      }

      let parsed: ParentToChildMessage;
      try {
        parsed = parentToChildMessageSchema.parse(event.data);
      } catch {
        return;
      }

      onParentMessageRef.current?.(parsed);

      if (parsed.type === "react-query:invalidate") {
        const keys = parsed.payload as unknown;
        if (Array.isArray(keys) && keys.every((k) => Array.isArray(k))) {
          for (const key of keys as unknown[][]) {
            void queryClient.invalidateQueries({ queryKey: key });
          }
        }
      }

      if (parsed.type === "react-query:set-data") {
        const p = parsed.payload as {
          queryKey?: unknown[];
          data?: unknown;
        };
        if (p?.queryKey && Array.isArray(p.queryKey)) {
          queryClient.setQueryData(p.queryKey, p.data);
        }
      }
    },
    [queryClient],
  );

  useEffect(() => {
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleMessage]);

  useEffect(() => {
    if (getParentOrigin()) {
      void ensureCsrfToken();
    }
  }, []);

  return <>{children}</>;
}

/** Send a structured message to the parent; target origin is always explicit. */
export function postToParent(message: ChildToParentMessage): void {
  if (typeof window === "undefined") return;
  const target = getParentOrigin();
  if (!target || window.parent === window) return;
  const parsed = childToParentMessageSchema.safeParse(message);
  if (!parsed.success) return;
  window.parent.postMessage(parsed.data, target);
}
