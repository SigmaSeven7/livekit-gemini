/**
 * Audio Playback Utilities
 * 
 * Helper functions for playing audio from URLs or base64 data.
 * Used in the history/demi-chat component for replaying interview messages.
 */

/**
 * Plays audio from a URL (e.g., from storage)
 * Uses HTML Audio element for simple playback
 */
export async function playAudioFromUrl(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(url);
    
    audio.onended = () => resolve();
    audio.onerror = (error) => {
      console.error('Failed to play audio from URL:', error);
      reject(error);
    };
    
    audio.play().catch((error) => {
      console.error('Failed to start audio playback:', error);
      reject(error);
    });
  });
}

/**
 * Plays audio from a base64-encoded WAV string
 * Uses Web Audio API for decoding and playback
 */
export async function playAudioFromBase64(base64Wav: string): Promise<void> {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  
  try {
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

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
    
    return new Promise((resolve, reject) => {
      source.onended = () => {
        if (ctx.state !== 'closed') {
          ctx.close();
        }
        resolve();
      };
      
      source.onerror = (error) => {
        console.error('Failed to play base64 audio:', error);
        reject(error);
      };
      
      source.start();
    });
  } catch (error) {
    console.error('Failed to decode/play base64 audio:', error);
    if (ctx.state !== 'closed') {
      ctx.close();
    }
    throw error;
  }
}
