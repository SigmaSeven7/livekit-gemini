import { useEffect, useRef, useCallback } from "react";

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

    // Initialize Audio Context and Recording
    useEffect(() => {
        if (!track || track.kind !== "audio") return;

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
        // Reset buffers
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
            chunksRef.current = [];
            totalSamplesRef.current = 0;
        };
    }, [track]);

    const playSlice = useCallback(async (startTimeMs: number, durationMs: number) => {
        const ctx = audioContextRef.current;
        if (!ctx) return;

        if (ctx.state === 'suspended') await ctx.resume();

        const recordStartTime = startTimeRef.current;
        if (recordStartTime === 0) return;

        const relativeStartMs = startTimeMs - recordStartTime;
        const startSeconds = Math.max(0, relativeStartMs / 1000);
        // Increase duration slightly to ensure we capture the tail of the speech
        const durationSeconds = (durationMs + 100) / 1000;

        const sampleRate = ctx.sampleRate;
        const startSample = Math.floor(startSeconds * sampleRate);
        const endSample = startSample + Math.floor(durationSeconds * sampleRate);
        const totalSamples = totalSamplesRef.current;

        if (startSample >= totalSamples) return;

        const safeEndSample = Math.min(endSample, totalSamples);
        const sampleCount = safeEndSample - startSample;
        if (sampleCount <= 0) return;

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

        // Create the buffer
        const playbackBuffer = ctx.createBuffer(1, sliceData.length, sampleRate);
        playbackBuffer.copyToChannel(sliceData, 0);

        const playSource = ctx.createBufferSource();
        const gainNode = ctx.createGain();

        playSource.buffer = playbackBuffer;

        // --- SMOOTHING LOGIC ---
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
    }, []);


    // const playSlice = useCallback(async (startTimeMs: number, durationMs: number) => {
    //     const ctx = audioContextRef.current;
    //     if (!ctx) return;

    //     if (ctx.state === 'suspended') await ctx.resume();

    //     const recordStartTime = startTimeRef.current;
    //     if (recordStartTime === 0) return;

    //     const relativeStartMs = startTimeMs - recordStartTime;
    //     const startSeconds = Math.max(0, relativeStartMs / 1000);
    //     // Increase duration slightly to ensure we capture the tail of the speech
    //     const durationSeconds = (durationMs + 100) / 1000;

    //     const sampleRate = ctx.sampleRate;
    //     const startSample = Math.floor(startSeconds * sampleRate);
    //     const endSample = startSample + Math.floor(durationSeconds * sampleRate);
    //     const totalSamples = totalSamplesRef.current;

    //     if (startSample >= totalSamples) return;

    //     const safeEndSample = Math.min(endSample, totalSamples);
    //     const sampleCount = safeEndSample - startSample;
    //     if (sampleCount <= 0) return;

    //     const sliceData = new Float32Array(sampleCount);
    //     let destOffset = 0;
    //     let currentPos = 0;

    //     for (const chunk of chunksRef.current) {
    //         const chunkEnd = currentPos + chunk.length;
    //         if (currentPos < safeEndSample && chunkEnd > startSample) {
    //             const chunkStartOffset = Math.max(0, startSample - currentPos);
    //             const chunkEndOffset = Math.min(chunk.length, safeEndSample - currentPos);
    //             const len = chunkEndOffset - chunkStartOffset;
    //             sliceData.set(chunk.subarray(chunkStartOffset, chunkEndOffset), destOffset);
    //             destOffset += len;
    //         }
    //         currentPos += chunk.length;
    //         if (currentPos >= safeEndSample) break;
    //     }

    //     // Create the buffer
    //     const playbackBuffer = ctx.createBuffer(1, sliceData.length, sampleRate);
    //     playbackBuffer.copyToChannel(sliceData, 0);

    //     const playSource = ctx.createBufferSource();
    //     const gainNode = ctx.createGain();

    //     playSource.buffer = playbackBuffer;

    //     // --- SMOOTHING LOGIC ---
    //     // Use a slightly longer ramp (40ms) to hide the "jumpy" transitions
    //     const rampTime = 0.04;
    //     const now = ctx.currentTime;

    //     // Start at 0, ramp to 1
    //     gainNode.gain.setValueAtTime(0, now);
    //     gainNode.gain.linearRampToValueAtTime(1, now + rampTime);

    //     // Hold at 1, then ramp to 0 at the very end
    //     const stopTime = now + (sliceData.length / sampleRate);
    //     gainNode.gain.setValueAtTime(1, stopTime - rampTime);
    //     gainNode.gain.linearRampToValueAtTime(0, stopTime);

    //     playSource.connect(gainNode);
    //     gainNode.connect(ctx.destination);

    //     playSource.start(now);
    //     playSource.stop(stopTime);
    // }, []);

    return {
        playSlice,
        isRecording: isRecordingRef.current
    };
}
