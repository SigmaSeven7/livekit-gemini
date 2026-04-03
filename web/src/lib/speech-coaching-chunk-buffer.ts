/**
 * Append-only chunk list for float32 mono PCM — avoids reallocating a full buffer on every
 * AudioWorklet message (O(n) copy per chunk). Concatenate once at flush time.
 */

export interface FloatChunkBuffer {
    chunks: Float32Array[];
    totalSamples: number;
}

export function createEmptyChunkBuffer(): FloatChunkBuffer {
    return { chunks: [], totalSamples: 0 };
}

export function appendFloatChunk(buf: FloatChunkBuffer, data: Float32Array): void {
    buf.chunks.push(data);
    buf.totalSamples += data.length;
}

/**
 * Remove the first `count` samples into one Float32Array; mutates `buf`.
 * If `count` exceeds length, takes everything.
 */
export function takeFirstSamples(buf: FloatChunkBuffer, count: number): Float32Array {
    if (count <= 0 || buf.totalSamples === 0) {
        return new Float32Array(0);
    }
    const take = Math.min(count, buf.totalSamples);
    const out = new Float32Array(take);
    let outPos = 0;
    let remaining = take;
    const newChunks: Float32Array[] = [];

    for (const ch of buf.chunks) {
        if (remaining <= 0) {
            newChunks.push(ch);
            continue;
        }
        if (ch.length <= remaining) {
            out.set(ch, outPos);
            outPos += ch.length;
            remaining -= ch.length;
        } else {
            out.set(ch.subarray(0, remaining), outPos);
            newChunks.push(ch.subarray(remaining));
            remaining = 0;
        }
    }

    buf.chunks = newChunks;
    buf.totalSamples = newChunks.reduce((sum, c) => sum + c.length, 0);
    return out;
}

export function clearFloatChunkBuffer(buf: FloatChunkBuffer): void {
    buf.chunks.length = 0;
    buf.totalSamples = 0;
}
