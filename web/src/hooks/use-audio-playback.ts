import { useEffect, useRef, useCallback } from "react";
import { applySmoothingToSamples, encodeToWavBase64 } from "@/lib/audio/wav-encoder";

export interface AudioSliceResult {
    /** Raw audio samples */
    samples: Float32Array<ArrayBuffer>;
    /** Sample rate in Hz */
    sampleRate: number;
}

export function useAudioPlayback(track?: MediaStreamTrack) {
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const processorNodeRef = useRef<ScriptProcessorNode | null>(null);

    // Optimized storage: Array of chunks instead of one giant growing buffer
    const chunksRef = useRef<Float32Array[]>([]);
    // Track total length to avoid recalculating often (though usually fast enough)
    const totalSamplesRef = useRef<number>(0);

    const startTimeRef = useRef<number>(0);
    const isRecordingRef = useRef(false);
    
    // Track the actual track ID to avoid resetting buffer when only the reference changes
    const currentTrackIdRef = useRef<string | null>(null);

    // Initialize Audio Context and Recording
    useEffect(() => {
        if (!track || track.kind !== "audio") return;
        
        // Check if this is actually a different track, not just a new reference to the same track
        // This prevents buffer wipe when LiveKit updates its internal state
        if (currentTrackIdRef.current === track.id) {
            // Same track, don't reset - just make sure we're still recording
            return;
        }
        
        // New track - store its ID
        const previousTrackId = currentTrackIdRef.current;
        currentTrackIdRef.current = track.id;
        
        // Only log if this is a track change (not initial setup)
        if (previousTrackId !== null) {
            console.log(`Audio track changed: ${previousTrackId} -> ${track.id}`);
        }

        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = ctx;

        const stream = new MediaStream([track]);
        const source = ctx.createMediaStreamSource(stream);
        sourceNodeRef.current = source;

        // Use ScriptProcessor for broad compatibility
        const processor = ctx.createScriptProcessor(4096, 1, 1);
        processorNodeRef.current = processor;

        startTimeRef.current = Date.now();
        isRecordingRef.current = true;
        // Reset buffers only when track actually changes
        chunksRef.current = [];
        totalSamplesRef.current = 0;

        processor.onaudioprocess = (e) => {
            if (!isRecordingRef.current) return;

            const inputData = e.inputBuffer.getChannelData(0);
            // Clone the data because inner buffers are reused
            const chunk = new Float32Array(inputData);

            chunksRef.current.push(chunk);
            totalSamplesRef.current += chunk.length;

            // Cleanup if it gets too large (> 50MB ~ 10 mins)
            // 48kHz * 60 * 10 = ~28.8M samples. 
            if (totalSamplesRef.current > 48000 * 60 * 10) {
                // Simple reset for now to avoid complexity
                chunksRef.current = [];
                totalSamplesRef.current = 0;
                startTimeRef.current = Date.now(); // Reset time anchor too
            }
        };

        source.connect(processor);
        processor.connect(ctx.destination);

        return () => {
            isRecordingRef.current = false;
            processor.disconnect();
            source.disconnect();
            if (ctx.state !== 'closed') {
                ctx.close();
            }
            // Don't clear buffers in cleanup - they may still be needed for playback
            // chunksRef.current = [];
            // totalSamplesRef.current = 0;
        };
    }, [track]);

    /**
     * Internal helper to extract raw audio slice from the buffer
     */
    const getRawSlice = useCallback((startTimeMs: number, durationMs: number): AudioSliceResult | null => {
        const ctx = audioContextRef.current;
        if (!ctx) return null;

        const recordStartTime = startTimeRef.current;
        if (recordStartTime === 0) return null;

        const relativeStartMs = startTimeMs - recordStartTime;
        const startSeconds = Math.max(0, relativeStartMs / 1000);
        // Increase duration to ensure we capture the tail of the speech
        const durationSeconds = (durationMs + 500) / 1000;

        const sampleRate = ctx.sampleRate;
        const startSample = Math.floor(startSeconds * sampleRate);
        const endSample = startSample + Math.floor(durationSeconds * sampleRate);
        const totalSamples = totalSamplesRef.current;

        if (startSample >= totalSamples) return null;

        const safeEndSample = Math.min(endSample, totalSamples);
        const sampleCount = safeEndSample - startSample;
        if (sampleCount <= 0) return null;

        const sliceData = new Float32Array(sampleCount);
        let destOffset = 0;
        let currentPos = 0;

        for (const chunk of chunksRef.current) {
            const chunkEnd = currentPos + chunk.length;
            if (currentPos < safeEndSample && chunkEnd > startSample) {
                const chunkStartOffset = Math.max(0, startSample - currentPos);
                const chunkEndOffset = Math.min(chunk.length, safeEndSample - currentPos);
                const len = chunkEndOffset - chunkStartOffset;
                sliceData.set(chunk.subarray(chunkStartOffset, chunkEndOffset), destOffset);
                destOffset += len;
            }
            currentPos += chunk.length;
            if (currentPos >= safeEndSample) break;
        }

        return { samples: sliceData, sampleRate };
    }, []);

    /**
     * Extracts an audio slice with smoothing already applied to the samples.
     * Use this when you need to save/encode the audio for storage.
     * 
     * @param startTimeMs - Absolute timestamp in ms when the speech started
     * @param durationMs - Duration in ms
     * @returns AudioSliceResult with smoothed samples, or null if no data
     */
    const extractAudioSlice = useCallback((startTimeMs: number, durationMs: number): AudioSliceResult | null => {
        const raw = getRawSlice(startTimeMs, durationMs);
        if (!raw) return null;

        // Apply smoothing to the samples before returning
        const smoothedSamples = applySmoothingToSamples(raw.samples, raw.sampleRate);
        return { samples: smoothedSamples, sampleRate: raw.sampleRate };
    }, [getRawSlice]);

    /**
     * Extracts audio slice and encodes it directly to base64 WAV.
     * Convenience method that combines extractAudioSlice + encoding.
     * 
     * @param startTimeMs - Absolute timestamp in ms when the speech started  
     * @param durationMs - Duration in ms
     * @returns Base64-encoded WAV string, or null if no data
     */
    const extractAudioAsBase64 = useCallback((startTimeMs: number, durationMs: number): string | null => {
        const raw = getRawSlice(startTimeMs, durationMs);
        if (!raw) return null;

        // encodeToWavBase64 applies smoothing by default
        return encodeToWavBase64(raw.samples, raw.sampleRate, true);
    }, [getRawSlice]);

    /**
     * Plays an audio slice. Used for real-time playback during the session.
     * Applies gain-based smoothing during playback for better real-time performance.
     * 
     * @param startTimeMs - Absolute timestamp in ms when the speech started
     * @param durationMs - Duration in ms
     */
    const playSlice = useCallback(async (startTimeMs: number, durationMs: number) => {
        const ctx = audioContextRef.current;
        if (!ctx) return;

        if (ctx.state === 'suspended') await ctx.resume();

        const raw = getRawSlice(startTimeMs, durationMs);
        if (!raw) return;

        const { samples: sliceData, sampleRate } = raw;

        // Create the buffer
        const playbackBuffer = ctx.createBuffer(1, sliceData.length, sampleRate);
        playbackBuffer.copyToChannel(sliceData, 0);

        const playSource = ctx.createBufferSource();
        const gainNode = ctx.createGain();

        playSource.buffer = playbackBuffer;

        // --- SMOOTHING LOGIC (gain-based for real-time playback) ---
        // Use a slightly longer ramp (40ms) to hide the "jumpy" transitions
        const rampTime = 0.04;
        const now = ctx.currentTime;

        // Start at 0, ramp to 1
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(1, now + rampTime);

        // Hold at 1, then ramp to 0 at the very end
        const stopTime = now + (sliceData.length / sampleRate);
        gainNode.gain.setValueAtTime(1, stopTime - rampTime);
        gainNode.gain.linearRampToValueAtTime(0, stopTime);

        playSource.connect(gainNode);
        gainNode.connect(ctx.destination);

        playSource.start(now);
        playSource.stop(stopTime);
    }, [getRawSlice]);

    /**
     * Plays audio from a base64-encoded WAV string.
     * Use this when playing back from stored audio.
     * 
     * @param base64Wav - Base64-encoded WAV audio
     */
    const playFromBase64 = useCallback(async (base64Wav: string) => {
        const ctx = audioContextRef.current;
        if (!ctx) {
            // Create a temporary context for playback
            const tempCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            await playBase64WithContext(tempCtx, base64Wav);
            return;
        }

        if (ctx.state === 'suspended') await ctx.resume();
        await playBase64WithContext(ctx, base64Wav);
    }, []);

    /**
     * Gets the current sample rate of the audio context
     */
    const getSampleRate = useCallback((): number => {
        return audioContextRef.current?.sampleRate ?? 48000;
    }, []);

    /**
     * Gets the recording start time (anchor for relative timestamps)
     */
    const getRecordStartTime = useCallback((): number => {
        return startTimeRef.current;
    }, []);

    return {
        playSlice,
        playFromBase64,
        extractAudioSlice,
        extractAudioAsBase64,
        getSampleRate,
        getRecordStartTime,
        isRecording: isRecordingRef.current
    };
}

/**
 * Helper to play base64 WAV with a given AudioContext
 */
async function playBase64WithContext(ctx: AudioContext, base64Wav: string): Promise<void> {
    try {
        // Decode base64 to array buffer
        const binary = atob(base64Wav);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        // Decode audio data
        const audioBuffer = await ctx.decodeAudioData(bytes.buffer);

        // Play
        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        source.start();
    } catch (error) {
        console.error('Failed to play base64 audio:', error);
    }
}
