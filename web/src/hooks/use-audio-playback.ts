import { useEffect, useRef, useCallback } from "react";

export function useAudioPlayback(track?: MediaStreamTrack) {
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const processorNodeRef = useRef<ScriptProcessorNode | null>(null);
    const audioBufferRef = useRef<Float32Array>(new Float32Array(0));
    const startTimeRef = useRef<number>(0);
    const isRecordingRef = useRef(false);

    // Initialize Audio Context and Recording
    useEffect(() => {
        if (!track || track.kind !== "audio") return;

        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = ctx;

        const stream = new MediaStream([track]);
        const source = ctx.createMediaStreamSource(stream);
        sourceNodeRef.current = source;

        // Use ScriptProcessor for broad compatibility (AudioWorklet is better but more complex to setup in Next.js without worker files)
        const processor = ctx.createScriptProcessor(4096, 1, 1);
        processorNodeRef.current = processor;

        startTimeRef.current = Date.now();
        isRecordingRef.current = true;

        processor.onaudioprocess = (e) => {
            if (!isRecordingRef.current) return;

            const inputData = e.inputBuffer.getChannelData(0);
            const newBuffer = new Float32Array(audioBufferRef.current.length + inputData.length);

            newBuffer.set(audioBufferRef.current);
            newBuffer.set(inputData, audioBufferRef.current.length);

            audioBufferRef.current = newBuffer;

            // Cleanup old buffer if it gets too large (> 50MB ~ 10 mins)
            if (audioBufferRef.current.length > 48000 * 60 * 10) {
                // Strategy: Just clear it for now to avoid complexity, or slice connection start
                // Ideally we implement a rolling buffer, but for a demo this is fine.
            }
        };

        source.connect(processor);
        processor.connect(ctx.destination); // Connect to destination to keep the graph alive, usually needed for ScriptProcessor

        return () => {
            isRecordingRef.current = false;
            processor.disconnect();
            source.disconnect();
            if (ctx.state !== 'closed') {
                ctx.close();
            }
            // Clear buffer on track change/unmount
            audioBufferRef.current = new Float32Array(0);
        };
    }, [track]);

    const playSlice = useCallback(async (startTimeMs: number, durationMs: number) => {
        const ctx = audioContextRef.current;
        if (!ctx) return;

        // Ensure context is running
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }

        const recordStartTime = startTimeRef.current;
        if (recordStartTime === 0) return;

        // Calculate relative time in the buffer
        // startTimeMs is the timestamp when the transcript was received
        // Offset relative to when recording started
        const relativeStartMs = startTimeMs - recordStartTime;

        // Convert to seconds
        const startSeconds = Math.max(0, relativeStartMs / 1000);
        const durationSeconds = durationMs / 1000;

        // Convert to samples
        const sampleRate = ctx.sampleRate;
        const startSample = Math.floor(startSeconds * sampleRate);
        const endSample = startSample + Math.floor(durationSeconds * sampleRate);
        const totalSamples = audioBufferRef.current.length;

        if (startSample >= totalSamples) {
            console.warn(`[AudioPlayback] Start time beyond buffer. Start: ${startSample}, Total: ${totalSamples}, RelTime: ${relativeStartMs}`);
            return;
        }

        // Safety check for end sample
        const safeEndSample = Math.min(endSample + sampleRate, totalSamples); // Add 1s buffer at end

        const sliceData = audioBufferRef.current.slice(startSample, safeEndSample);

        if (sliceData.length === 0) return;

        // Create a new AudioBuffer for playback
        const playbackBuffer = ctx.createBuffer(1, sliceData.length, sampleRate);
        playbackBuffer.copyToChannel(sliceData, 0);

        const playSource = ctx.createBufferSource();
        playSource.buffer = playbackBuffer;
        playSource.connect(ctx.destination);
        playSource.start();
    }, []);

    return {
        playSlice,
        isRecording: isRecordingRef.current
    };
}
