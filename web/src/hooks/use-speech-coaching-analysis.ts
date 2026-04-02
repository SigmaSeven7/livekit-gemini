"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildWavFromMonoPcm16, float32ToPcm16Mono } from "@/lib/speech-coaching-audio";
import type { SpeechCoachingAnalyzeResponse, SpeechCoachingEntry } from "@/types/speech-coaching";

const MIN_CLIP_SEC = 20;
const MAX_CLIP_SEC = 120;
const COOLDOWN_MS = 45_000;
/** Trailing silence (~end of sentence) before we analyze; avoids cutting mid-utterance */
const SILENCE_END_UTTERANCE_MS = 1500;
/** RMS threshold on float32 mono [-1,1] — below = quiet / pause */
const SPEECH_RMS_THRESHOLD = 0.018;

function rmsMono(samples: Float32Array): number {
    if (samples.length === 0) return 0;
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
        const x = samples[i];
        sum += x * x;
    }
    return Math.sqrt(sum / samples.length);
}

function appendFloat32(a: Float32Array, b: Float32Array): Float32Array {
    const out = new Float32Array(a.length + b.length);
    out.set(a, 0);
    out.set(b, a.length);
    return out;
}

function sliceOffFront(buffer: Float32Array, count: number): Float32Array {
    if (count >= buffer.length) return new Float32Array(0);
    return buffer.slice(count);
}

/**
 * Browsers start AudioContext in `suspended` until a user gesture unlocks audio.
 * AudioWorkletNode throws "No execution context available" if created while suspended.
 */
async function resumeAudioContext(ctx: AudioContext): Promise<void> {
    if (ctx.state === "running") return;
    try {
        await ctx.resume();
    } catch {
        /* ignore */
    }

    await new Promise<void>((resolve) => {
        if (ctx.state === "running") {
            resolve();
            return;
        }
        let settled = false;
        const done = () => {
            if (settled || ctx.state !== "running") return;
            settled = true;
            cleanup();
            resolve();
        };

        const cleanup = () => {
            ctx.removeEventListener("statechange", onState);
            window.removeEventListener("pointerdown", tryResume);
            window.removeEventListener("keydown", tryResume);
        };

        const onState = () => {
            if (ctx.state === "running") done();
        };

        const tryResume = () => {
            void ctx.resume().then(() => {
                if (ctx.state === "running") done();
            });
        };

        ctx.addEventListener("statechange", onState);
        window.addEventListener("pointerdown", tryResume, { passive: true });
        window.addEventListener("keydown", tryResume);
        void ctx.resume().then(() => {
            if (ctx.state === "running") done();
        });
    });
}

export interface UseSpeechCoachingAnalysisOptions {
    enabled: boolean;
    mediaStreamTrack: MediaStreamTrack | null;
    assistantState:
        | "disconnected"
        | "connecting"
        | "initializing"
        | "listening"
        | "thinking"
        | "speaking";
    pauseWhenAssistantSpeaking: boolean;
    pauseWhenHidden: boolean;
    onEntry: (entry: Omit<SpeechCoachingEntry, "id" | "at">) => void;
}

export function useSpeechCoachingAnalysis({
    enabled,
    mediaStreamTrack,
    assistantState,
    pauseWhenAssistantSpeaking,
    pauseWhenHidden,
    onEntry,
}: UseSpeechCoachingAnalysisOptions): {
    isAnalyzing: boolean;
    error: string | null;
    lastAnalyzedAt: number | null;
} {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastAnalyzedAt, setLastAnalyzedAt] = useState<number | null>(null);

    const bufferRef = useRef<Float32Array>(new Float32Array(0));
    /** Consecutive trailing silence at end of buffer (ms) — sentence boundary proxy */
    const trailingSilenceMsRef = useRef(0);
    const hasHeardSpeechRef = useRef(false);
    const sampleRateRef = useRef(48000);
    const inFlightRef = useRef(false);
    const lastSuccessRef = useRef(0);
    const assistantStateRef = useRef(assistantState);
    assistantStateRef.current = assistantState;

    const onEntryRef = useRef(onEntry);
    onEntryRef.current = onEntry;

    const pauseWhenAssistantSpeakingRef = useRef(pauseWhenAssistantSpeaking);
    pauseWhenAssistantSpeakingRef.current = pauseWhenAssistantSpeaking;
    const pauseWhenHiddenRef = useRef(pauseWhenHidden);
    pauseWhenHiddenRef.current = pauseWhenHidden;

    const tryFlush = useCallback(async (reason: "max" | "utterance") => {
        const sr = sampleRateRef.current;
        const minSamples = Math.ceil(MIN_CLIP_SEC * sr);
        const maxSamples = Math.floor(MAX_CLIP_SEC * sr);
        let buf = bufferRef.current;

        if (inFlightRef.current) return;
        if (Date.now() - lastSuccessRef.current < COOLDOWN_MS) return;
        if (typeof document !== "undefined" && pauseWhenHiddenRef.current && document.visibilityState === "hidden") {
            return;
        }
        if (pauseWhenAssistantSpeakingRef.current && assistantStateRef.current === "speaking") {
            return;
        }

        if (reason === "max") {
            if (buf.length < maxSamples) return;
        } else {
            if (buf.length < minSamples || !hasHeardSpeechRef.current) return;
        }

        const take = reason === "max" ? maxSamples : buf.length;
        const chunk = buf.slice(0, take);
        buf = sliceOffFront(buf, take);
        bufferRef.current = buf;
        trailingSilenceMsRef.current = 0;
        hasHeardSpeechRef.current = false;

        const pcm = float32ToPcm16Mono(chunk);
        const wav = buildWavFromMonoPcm16(pcm, sr);

        inFlightRef.current = true;
        setIsAnalyzing(true);
        setError(null);

        try {
            const form = new FormData();
            form.append("audio", new Blob([wav], { type: "audio/wav" }), "clip.wav");

            const res = await fetch("/api/speech-coaching/analyze", {
                method: "POST",
                body: form,
            });

            const json = (await res.json()) as SpeechCoachingAnalyzeResponse;

            if (!res.ok || json.status === "error") {
                const msg = json.status === "error" ? json.message : `HTTP ${res.status}`;
                setError(msg);
                onEntryRef.current({
                    source: "client",
                    error: msg,
                });
                return;
            }

            setLastAnalyzedAt(Date.now());
            lastSuccessRef.current = Date.now();
            onEntryRef.current({
                source: "client",
                toast: json.toast,
                data: json.data,
                model: json.model,
            });
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            setError(msg);
            onEntryRef.current({
                source: "client",
                error: msg,
            });
        } finally {
            inFlightRef.current = false;
            setIsAnalyzing(false);
        }
    }, []);

    const tryFlushRef = useRef(tryFlush);
    tryFlushRef.current = tryFlush;

    useEffect(() => {
        if (!enabled || !mediaStreamTrack || mediaStreamTrack.readyState === "ended") {
            bufferRef.current = new Float32Array(0);
            trailingSilenceMsRef.current = 0;
            hasHeardSpeechRef.current = false;
            return;
        }

        let ctx: AudioContext | null = null;
        let source: MediaStreamAudioSourceNode | null = null;
        let worklet: AudioWorkletNode | null = null;
        let gain: GainNode | null = null;
        let cancelled = false;

        const setup = async () => {
            try {
                ctx = new AudioContext();
                sampleRateRef.current = ctx.sampleRate;
                const stream = new MediaStream([mediaStreamTrack]);

                await resumeAudioContext(ctx);
                if (cancelled) return;
                if (ctx.state !== "running") {
                    setError(
                        "Audio capture is blocked until you interact with the page (click or press a key).",
                    );
                    return;
                }

                const processorCode = `
          class PCMForward extends AudioWorkletProcessor {
            process(inputs) {
              const ch0 = inputs[0]?.[0];
              if (ch0 && ch0.length) {
                const copy = new Float32Array(ch0.length);
                copy.set(ch0);
                this.port.postMessage(copy, [copy.buffer]);
              }
              return true;
            }
          }
          registerProcessor('pcm-forward', PCMForward);
        `;
                const blob = new Blob([processorCode], { type: "application/javascript" });
                const url = URL.createObjectURL(blob);
                await ctx.audioWorklet.addModule(url);
                URL.revokeObjectURL(url);
                if (cancelled) return;

                source = ctx.createMediaStreamSource(stream);
                worklet = new AudioWorkletNode(ctx, "pcm-forward");
                gain = ctx.createGain();
                gain.gain.value = 0;
                source.connect(worklet);
                worklet.connect(gain);
                gain.connect(ctx.destination);

                worklet.port.onmessage = (ev: MessageEvent<Float32Array>) => {
                    if (cancelled) return;
                    const assistantSpeaking =
                        pauseWhenAssistantSpeakingRef.current && assistantStateRef.current === "speaking";
                    const hidden =
                        typeof document !== "undefined" &&
                        pauseWhenHiddenRef.current &&
                        document.visibilityState === "hidden";
                    if (assistantSpeaking || hidden) return;

                    const data = ev.data;
                    const sr = sampleRateRef.current;
                    const chunkMs = (data.length / sr) * 1000;
                    const loud = rmsMono(data) >= SPEECH_RMS_THRESHOLD;

                    bufferRef.current = appendFloat32(bufferRef.current, data);

                    if (loud) {
                        hasHeardSpeechRef.current = true;
                        trailingSilenceMsRef.current = 0;
                    } else {
                        trailingSilenceMsRef.current += chunkMs;
                    }

                    const buf = bufferRef.current;
                    const minSamples = Math.ceil(MIN_CLIP_SEC * sr);
                    const maxSamples = Math.floor(MAX_CLIP_SEC * sr);

                    if (buf.length >= maxSamples) {
                        if (!hasHeardSpeechRef.current) {
                            bufferRef.current = new Float32Array(0);
                            trailingSilenceMsRef.current = 0;
                            return;
                        }
                        void tryFlushRef.current("max");
                        return;
                    }

                    const sec = buf.length / sr;
                    if (
                        sec >= MIN_CLIP_SEC &&
                        hasHeardSpeechRef.current &&
                        trailingSilenceMsRef.current >= SILENCE_END_UTTERANCE_MS
                    ) {
                        void tryFlushRef.current("utterance");
                    }
                };
            } catch (e) {
                console.error("speech coaching audio pipeline:", e);
                setError(e instanceof Error ? e.message : String(e));
            }
        };

        void setup();

        return () => {
            cancelled = true;
            bufferRef.current = new Float32Array(0);
            trailingSilenceMsRef.current = 0;
            hasHeardSpeechRef.current = false;
            try {
                worklet?.port.close();
                source?.disconnect();
                worklet?.disconnect();
                gain?.disconnect();
                void ctx?.close();
            } catch {
                /* ignore */
            }
        };
    }, [enabled, mediaStreamTrack]);

    return { isAnalyzing, error, lastAnalyzedAt };
}
