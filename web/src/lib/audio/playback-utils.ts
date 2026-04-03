/**
 * Audio Playback Utilities
 * 
 * Helper functions for playing audio from URLs with timestamp seeking.
 * Used in the history/demi-chat component for replaying interview messages.
 */

import { ConversationMessage } from "@/types/conversation";

// Singleton audio element for playing audio with seeking
let audioElement: HTMLAudioElement | null = null;
let currentAudioUrl: string | null = null;

// Track currently playing message and clip bounds
let playingMessageId: string | null = null;
let currentStartTimeMs: number = 0;
let currentEndTime: number = 0;
let checkInterval: number | null = null;

function getAudioElement(): HTMLAudioElement {
  if (!audioElement) {
    audioElement = new Audio();
    audioElement.addEventListener("ended", () => {
      playingMessageId = null;
      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }
    });
  }
  return audioElement;
}

/**
 * Plays audio from a URL, seeking to a specific start time and stopping at end time.
 * @param url        - The URL to fetch audio from
 * @param startTimeMs - Start time in milliseconds
 * @param endTimeMs  - End time in milliseconds (optional, plays to end if not provided)
 * @param messageId  - Unique identifier for the message being played
 * @param rate       - Playback speed (0.5–2, default 1)
 */
export async function playAudioFromUrlWithTimestamp(
  url: string,
  startTimeMs: number,
  endTimeMs?: number,
  messageId?: string,
  rate: number = 1,
): Promise<void> {
  const audio = getAudioElement();

  if (currentAudioUrl !== url) {
    audio.src = url;
    currentAudioUrl = url;
    await audio.play();
  } else if (audio.paused) {
    await audio.play();
  }

  audio.currentTime = startTimeMs / 1000;
  audio.playbackRate = Math.max(0.5, Math.min(2, rate));

  if (endTimeMs !== undefined && messageId) {
    playingMessageId = messageId;
    currentStartTimeMs = startTimeMs;
    currentEndTime = endTimeMs;

    if (checkInterval) clearInterval(checkInterval);

    checkInterval = window.setInterval(() => {
      if (playingMessageId === messageId) {
        if (audio.currentTime * 1000 >= currentEndTime) {
          audio.pause();
          playingMessageId = null;
          if (checkInterval) { clearInterval(checkInterval); checkInterval = null; }
        }
      }
    }, 100);
  }

  return new Promise((resolve, reject) => {
    audio.onended = () => {
      playingMessageId = null;
      if (checkInterval) { clearInterval(checkInterval); checkInterval = null; }
      resolve();
    };
    audio.onerror = (error) => {
      playingMessageId = null;
      if (checkInterval) { clearInterval(checkInterval); checkInterval = null; }
      console.error('Failed to play audio:', error);
      reject(error);
    };
  });
}

/**
 * Returns the current playback position within the active clip, or null if nothing is playing.
 */
export function getPlaybackProgress(): { currentMs: number; startMs: number; endMs: number } | null {
  if (!audioElement || !playingMessageId) return null;
  return {
    currentMs: audioElement.currentTime * 1000,
    startMs: currentStartTimeMs,
    endMs: currentEndTime,
  };
}

/**
 * Seeks to a fractional position (0–1) within the currently playing clip.
 */
export function seekToFraction(fraction: number): void {
  if (!audioElement || !playingMessageId) return;
  const f = Math.max(0, Math.min(1, fraction));
  audioElement.currentTime = (currentStartTimeMs + (currentEndTime - currentStartTimeMs) * f) / 1000;
}

/**
 * Changes the playback rate of the currently loaded audio element (0.5–2).
 */
export function setPlaybackRate(rate: number): void {
  if (audioElement) audioElement.playbackRate = Math.max(0.5, Math.min(2, rate));
}

/**
 * Stops currently playing audio
 */
export function stopAudio(): void {
  if (audioElement) {
    audioElement.pause();
    audioElement.currentTime = 0;
    playingMessageId = null;
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
  }
}

/**
 * Gets the currently playing message ID
 */
export function getPlayingMessageId(): string | null {
  return playingMessageId;
}

/**
 * Concatenates messages that have the same timestampStart.
 * Messages with the same start time are merged, with the one having
 * the greater timestampEnd coming last.
 * 
 * @param messages - Array of conversation messages
 * @returns Concatenated array of messages
 */
export function concatenateMessagesWithSameStartTime(
  messages: ConversationMessage[]
): ConversationMessage[] {
  if (!messages || messages.length === 0) return [];

  // Group messages by timestampStart
  const groupedByStartTime = new Map<number, ConversationMessage[]>();

  for (const message of messages) {
    const startTime = message.timestampStart;
    if (!groupedByStartTime.has(startTime)) {
      groupedByStartTime.set(startTime, []);
    }
    groupedByStartTime.get(startTime)!.push(message);
  }

  // For each group with same start time, concatenate transcripts
  // and keep the max end time
  const result: ConversationMessage[] = [];

  for (const [startTime, group] of groupedByStartTime) {
    if (group.length === 1) {
      // No concatenation needed
      result.push(group[0]);
    } else {
      // Sort by timestampEnd to find the one with greatest end time
      const sortedByEnd = [...group].sort((a, b) => a.timestampEnd - b.timestampEnd);
      
      // Concatenate all transcripts
      const concatenatedTranscript = sortedByEnd
        .map(m => m.transcript)
        .join(" ");

      // Use the message with the greatest timestampEnd as the base
      const lastMessage = sortedByEnd[sortedByEnd.length - 1];

      // Create a new concatenated message
      const concatenatedMessage: ConversationMessage = {
        ...lastMessage,
        transcript: concatenatedTranscript,
        // Keep the original transcriptId of the last message, or create a new one
        transcriptId: lastMessage.transcriptId,
      };

      result.push(concatenatedMessage);
    }
  }

  // Sort by timestampStart to maintain order
  return result.sort((a, b) => a.timestampStart - b.timestampStart);
}
