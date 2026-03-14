"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import type { LocalAudioTrack } from "livekit-client";

interface PreFlightContextValue {
  calibratedTrack: LocalAudioTrack | null;
  passPreFlight: (track: LocalAudioTrack) => void;
  takeAndClearTrack: () => LocalAudioTrack | null;
}

const PreFlightContext = createContext<PreFlightContextValue | undefined>(
  undefined
);

export function PreFlightProvider({ children }: { children: React.ReactNode }) {
  const [calibratedTrack, setCalibratedTrack] =
    useState<LocalAudioTrack | null>(null);

  const passPreFlight = useCallback((track: LocalAudioTrack) => {
    console.log("[PreFlightContext] passPreFlight called with track:", {
      id: track.id,
      sid: track.sid,
      muted: track.isMuted
    });
    setCalibratedTrack(track);
  }, []);

  const takeAndClearTrack = useCallback(() => {
    console.log("[PreFlightContext] takeAndClearTrack called, current track:", calibratedTrack ? {
      id: calibratedTrack.id,
      sid: calibratedTrack.sid
    } : null);
    const current = calibratedTrack;
    setCalibratedTrack(null);
    return current;
  }, [calibratedTrack]);

  return (
    <PreFlightContext.Provider
      value={{ calibratedTrack, passPreFlight, takeAndClearTrack }}
    >
      {children}
    </PreFlightContext.Provider>
  );
}

export function usePreFlightContext() {
  const ctx = useContext(PreFlightContext);
  if (ctx === undefined) {
    throw new Error("usePreFlightContext must be used within PreFlightProvider");
  }
  return ctx;
}
