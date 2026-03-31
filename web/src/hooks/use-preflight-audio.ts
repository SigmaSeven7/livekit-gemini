"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createLocalAudioTrack, LocalAudioTrack } from "livekit-client";

export interface UsePreFlightAudioResult {
  track: LocalAudioTrack | null;
  krispEnabled: boolean;
  error: string | null;
  cleanup: () => void;
  markTransferred: () => void;
}

export function usePreFlightAudio(): UsePreFlightAudioResult {
  const [track, setTrack] = useState<LocalAudioTrack | null>(null);
  const [krispEnabled, setKrispEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trackRef = useRef<LocalAudioTrack | null>(null);
  const transferredRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const cleanup = useCallback(() => {
    if (trackRef.current && !transferredRef.current) {
      trackRef.current.stop();
      trackRef.current = null;
      setTrack(null);
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  const markTransferred = useCallback(() => {
    transferredRef.current = true;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        setError(null);

        const baseOptions: Parameters<typeof createLocalAudioTrack>[0] = {
          echoCancellation: true,
          noiseSuppression: true,
        };

        const audioTrack = await createLocalAudioTrack(baseOptions);
        const ctx = new (window.AudioContext ||
          (window as Window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext)({ latencyHint: "interactive" });
        audioContextRef.current = ctx;

        let usedKrisp = false;
        try {
          const { KrispNoiseFilter, isKrispNoiseFilterSupported } =
            await import("@livekit/krisp-noise-filter");
          if (isKrispNoiseFilterSupported()) {
            audioTrack.setAudioContext(ctx);
            await audioTrack.setProcessor(KrispNoiseFilter());
            usedKrisp = !!audioTrack.getProcessor();
          }
        } catch {
          // Krisp init failed; track works without it
        }

        if (cancelled) {
          audioTrack.stop();
          void ctx.close();
          audioContextRef.current = null;
          return;
        }

        trackRef.current = audioTrack;
        if (usedKrisp) {
          setKrispEnabled(true);
        }

        setTrack(audioTrack);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to access microphone";
        setError(message);
      }
    }

    setup();

    return () => {
      cancelled = true;
      if (trackRef.current && !transferredRef.current) {
        trackRef.current.stop();
        trackRef.current = null;
      }
      if (audioContextRef.current) {
        void audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  return {
    track,
    krispEnabled,
    error,
    cleanup,
    markTransferred,
  };
}
