/**
 * Mono float32 [-1, 1] → PCM16 LE; WAV wrapper for mono PCM16.
 * Used by the client coaching pipeline and unit tests.
 */

export function float32ToPcm16Mono(float32: Float32Array): Int16Array {
    const out = new Int16Array(float32.length);
    for (let i = 0; i < float32.length; i++) {
        const s = Math.max(-1, Math.min(1, float32[i]));
        out[i] = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
    }
    return out;
}

/** Total bytes of PCM16 mono for a duration (no WAV header). */
export function pcm16MonoByteLength(sampleRate: number, durationSec: number): number {
    return Math.ceil(sampleRate * durationSec) * 2;
}

/** WAV file size = 44-byte header + PCM16 mono samples. */
export function wavMonoPcm16ByteLength(sampleRate: number, durationSec: number): number {
    return 44 + pcm16MonoByteLength(sampleRate, durationSec);
}

export function buildWavFromMonoPcm16(pcm: Int16Array, sampleRate: number): ArrayBuffer {
    const numChannels = 1;
    const bitsPerSample = 16;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcm.length * 2;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeStr = (offset: number, s: string) => {
        for (let i = 0; i < s.length; i++) {
            view.setUint8(offset + i, s.charCodeAt(i));
        }
    };

    writeStr(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeStr(36, "data");
    view.setUint32(40, dataSize, true);

    const pcmView = new Int16Array(buffer, 44, pcm.length);
    pcmView.set(pcm);

    return buffer;
}
