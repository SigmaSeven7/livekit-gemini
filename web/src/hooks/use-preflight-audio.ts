"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createLocalAudioTrack, LocalAudioTrack } from "livekit-client";

const VOLUME_THRESHOLD = 0.4;
const SUSTAINED_DURATION_MS = 1500;
const VOLUME_POLL_INTERVAL_MS = 50;

export interface UsePreFlightAudioResult {
  track: LocalAudioTrack | null;
  volume: number;
  isCalibrated: boolean;
  krispEnabled: boolean;
  error: string | null;
  cleanup: () => void;
  markTransferred: () => void;
}

export function usePreFlightAudio(): UsePreFlightAudioResult {
  const [track, setTrack] = useState<LocalAudioTrack | null>(null);
  const [volume, setVolume] = useState(0);
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [krispEnabled, setKrispEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sustainedStartRef = useRef<number | null>(null);
  const trackRef = useRef<LocalAudioTrack | null>(null);
  const transferredRef = useRef(false);
  const analyserRef = useRef<{
    source: MediaStreamAudioSourceNode;
    analyser: AnalyserNode;
    ctx: AudioContext;
  } | null>(null);

  const cleanup = useCallback(() => {
    if (trackRef.current && !transferredRef.current) {
      trackRef.current.stop();
      trackRef.current = null;
      setTrack(null);
    }
    if (analyserRef.current) {
      analyserRef.current.source.disconnect();
      analyserRef.current.ctx.close();
      analyserRef.current = null;
    }
    sustainedStartRef.current = null;
    setVolume(0);
    setIsCalibrated(false);
  }, []);

  const markTransferred = useCallback(() => {
    transferredRef.current = true;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let volumeInterval: ReturnType<typeof setInterval> | null = null;

    async function setup() {
      try {
        setError(null);

        const baseOptions: Parameters<typeof createLocalAudioTrack>[0] = {
          echoCancellation: true,
          noiseSuppression: true,
        };

        let audioTrack: LocalAudioTrack;
        let usedKrisp = false;

        audioTrack = await createLocalAudioTrack(baseOptions);
        const ctx = new (window.AudioContext ||
          (window as Window & { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext)({ latencyHint: "interactive" });
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
          ctx.close();
          return;
        }

        trackRef.current = audioTrack;
        if (!cancelled && usedKrisp) {
          setKrispEnabled(true);
        }

        setTrack(audioTrack);

        const stream = audioTrack.mediaStream;
        if (!stream) {
          audioTrack.stop();
          ctx.close();
          setError("Audio stream not available");
          return;
        }
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        analyserRef.current = { source, analyser, ctx };

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        volumeInterval = setInterval(() => {
          if (!analyserRef.current) return;

          analyserRef.current.analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const average = bufferLength > 0 ? sum / bufferLength : 0;
          const normalizedVolume = Math.min(1, average / 80);

          setVolume(normalizedVolume);

          if (normalizedVolume >= VOLUME_THRESHOLD) {
            const now = Date.now();
            if (sustainedStartRef.current === null) {
              sustainedStartRef.current = now;
            } else if (now - sustainedStartRef.current >= SUSTAINED_DURATION_MS) {
              setIsCalibrated(true);
            }
          } else {
            sustainedStartRef.current = null;
          }
        }, VOLUME_POLL_INTERVAL_MS);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Failed to access microphone";
        setError(message);
      }
    }

    setup();

    return () => {
      cancelled = true;
      if (volumeInterval) clearInterval(volumeInterval);
      if (trackRef.current && !transferredRef.current) {
        trackRef.current.stop();
        trackRef.current = null;
      }
      if (analyserRef.current) {
        analyserRef.current.source.disconnect();
        analyserRef.current.ctx.close();
        analyserRef.current = null;
      }
    };
  }, []);

  return {
    track,
    volume,
    isCalibrated,
    krispEnabled,
    error,
    cleanup,
    markTransferred,
  };
}
