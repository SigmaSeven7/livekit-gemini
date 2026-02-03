/**
 * WAV Encoder Utility
 * Converts Float32Array audio data to WAV format and base64 encoding
 */

/**
 * Applies fade-in and fade-out smoothing directly to audio samples.
 * This eliminates clicks and pops at segment boundaries.
 * 
 * @param samples - Raw audio samples
 * @param sampleRate - Sample rate in Hz
 * @param rampDurationMs - Duration of fade in/out in milliseconds (default 40ms)
 * @returns New Float32Array with smoothing applied
 */
export function applySmoothingToSamples(
  samples: Float32Array,
  sampleRate: number,
  rampDurationMs: number = 40
): Float32Array<ArrayBuffer> {
  const rampSamples = Math.floor((rampDurationMs / 1000) * sampleRate);
  // Create a new Float32Array with a fresh ArrayBuffer to ensure type compatibility
  const result = new Float32Array(samples.length);
  result.set(samples);
  
  // Fade in: multiply by linear ramp from 0 to 1
  for (let i = 0; i < rampSamples && i < result.length; i++) {
    result[i] *= i / rampSamples;
  }
  
  // Fade out: multiply by linear ramp from 1 to 0
  for (let i = 0; i < rampSamples && i < result.length; i++) {
    result[result.length - 1 - i] *= i / rampSamples;
  }
  
  return result;
}

/**
 * Encodes Float32Array audio data to WAV format as a Uint8Array
 * 
 * @param samples - Audio samples in Float32Array format (-1 to 1 range)
 * @param sampleRate - Sample rate in Hz (e.g., 48000)
 * @param numChannels - Number of audio channels (default 1 for mono)
 * @returns Uint8Array containing WAV file data
 */
export function encodeToWav(
  samples: Float32Array,
  sampleRate: number,
  numChannels: number = 1
): Uint8Array {
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  
  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);
  
  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true); // File size - 8
  writeString(view, 8, 'WAVE');
  
  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  
  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Write audio data (convert Float32 to Int16)
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    // Clamp to [-1, 1] range and convert to 16-bit integer
    const sample = Math.max(-1, Math.min(1, samples[i]));
    const int16Sample = sample < 0 
      ? sample * 0x8000 
      : sample * 0x7FFF;
    view.setInt16(offset, int16Sample, true);
    offset += 2;
  }
  
  return new Uint8Array(buffer);
}

/**
 * Helper to write string to DataView
 */
function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Encodes Float32Array audio data to base64 WAV string
 * 
 * @param samples - Audio samples in Float32Array format
 * @param sampleRate - Sample rate in Hz
 * @param applySmoothing - Whether to apply fade in/out smoothing (default true)
 * @returns Base64-encoded WAV string
 */
export function encodeToWavBase64(
  samples: Float32Array,
  sampleRate: number,
  applySmoothing: boolean = true
): string {
  const processedSamples = applySmoothing 
    ? applySmoothingToSamples(samples, sampleRate)
    : samples;
  
  const wavData = encodeToWav(processedSamples, sampleRate);
  return uint8ArrayToBase64(wavData);
}

/**
 * Converts Uint8Array to base64 string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes base64 WAV string to Float32Array audio samples
 * 
 * @param base64 - Base64-encoded WAV string
 * @returns Object containing samples and sample rate
 */
export function decodeWavBase64(base64: string): { samples: Float32Array; sampleRate: number } {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  
  const view = new DataView(bytes.buffer);
  
  // Read WAV header
  const sampleRate = view.getUint32(24, true);
  const bitsPerSample = view.getUint16(34, true);
  const dataOffset = 44;
  const dataSize = view.getUint32(40, true);
  const numSamples = dataSize / (bitsPerSample / 8);
  
  const samples = new Float32Array(numSamples);
  
  if (bitsPerSample === 16) {
    for (let i = 0; i < numSamples; i++) {
      const int16Sample = view.getInt16(dataOffset + i * 2, true);
      samples[i] = int16Sample / (int16Sample < 0 ? 0x8000 : 0x7FFF);
    }
  }
  
  return { samples, sampleRate };
}

/**
 * Converts base64 WAV to Buffer for server-side operations
 * This is used in API routes to save audio files
 * 
 * @param base64 - Base64-encoded WAV string
 * @returns Buffer containing WAV file data
 */
export function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}
