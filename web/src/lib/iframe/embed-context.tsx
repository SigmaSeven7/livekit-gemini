"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export interface IframeEmbedContextValue {
  /** True when running in a frame (client-only; false on SSR). */
  isInIframe: boolean;
  /** Server hint: Sec-Fetch-Dest === iframe (set via optional script injection). */
  serverIsIframeDest: boolean;
}

const IframeEmbedContext = createContext<IframeEmbedContextValue | null>(null);

export function IframeEmbedProvider({
  children,
  serverIsIframeDest = false,
}: {
  children: ReactNode;
  serverIsIframeDest?: boolean;
}) {
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }
  }, []);

  const value = useMemo(
    () => ({ isInIframe, serverIsIframeDest }),
    [isInIframe, serverIsIframeDest],
  );

  return (
    <IframeEmbedContext.Provider value={value}>
      {children}
    </IframeEmbedContext.Provider>
  );
}

export function useIframeEmbed(): IframeEmbedContextValue {
  const ctx = useContext(IframeEmbedContext);
  if (!ctx) {
    return { isInIframe: false, serverIsIframeDest: false };
  }
  return ctx;
}
