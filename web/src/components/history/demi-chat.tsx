"use client";

import { useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { ConversationMessage } from "@/types/conversation";
import {
  playAudioFromUrlWithTimestamp,
  stopAudio,
  getPlayingMessageId,
  getPlaybackProgress,
  seekToFraction,
  setPlaybackRate,
} from "@/lib/audio/playback-utils";
import { formatTimeOnly } from "@/lib/utils/date";

const SPEED_OPTIONS = [1, 1.5, 2] as const;
type Speed = (typeof SPEED_OPTIONS)[number];

interface DemiChatProps {
  messages: ConversationMessage[];
  audioUrl?: string;
  isRtl?: boolean;
}

function formatClipMs(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function DemiChat({ messages, audioUrl, isRtl = false }: DemiChatProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  /** Forces re-renders while audio plays so `getPlaybackProgress()` updates. */
  const [, setProgressTick] = useState(0);
  const [speed, setSpeed] = useState<Speed>(1);

  // Poll: previously `setPlayingId(getPlayingMessageId())` cleared the row as soon as the user
  // clicked Play, because `playingMessageId` in playback-utils is only set after async load/seek.
  // `utilId ?? prev` keeps the optimistic id; clip UI uses message timestamps until util progress exists.
  useEffect(() => {
    const poll = () => {
      const utilId = getPlayingMessageId();
      setPlayingId((prev) => utilId ?? prev);
      setProgressTick((n) => n + 1);
    };
    const interval = setInterval(poll, 100);
    poll();
    return () => clearInterval(interval);
  }, []);

  const handleSpeedChange = (rate: Speed) => {
    setSpeed(rate);
    setPlaybackRate(rate);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    seekToFraction((e.clientX - rect.left) / rect.width);
  };

  const handlePlay = async (message: ConversationMessage) => {
    if (playingId === message.transcriptId) {
      stopAudio();
      setPlayingId(null);
      return;
    }

    if (!audioUrl) {
      console.warn("No audio URL available");
      return;
    }

    setPlayingId(message.transcriptId);

    try {
      await playAudioFromUrlWithTimestamp(
        audioUrl,
        message.timestampStart,
        message.timestampEnd,
        message.transcriptId,
        speed,
      );
    } catch (error) {
      console.error("Failed to play audio:", error);
    } finally {
      setPlayingId(null);
    }
  };

  if (messages.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-sm">No messages in this interview</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="text-xs font-semibold uppercase tracking-widest mb-4 text-gray-500 px-2">
        Conversation ({messages.length} messages)
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {(() => {
          const utilPlayingId = getPlayingMessageId();
          return messages.map((message) => {
          const isAgent = message.participant === "agent";
          const hasAudio = !!audioUrl;
          const isPlaying = playingId === message.transcriptId;

          // RTL: user on right (items-end), agent on left (items-start)
          // LTR: user on left (items-start), agent on right (items-end)
          const alignment = isRtl
            ? isAgent ? "items-start" : "items-end"
            : isAgent ? "items-end" : "items-start";

          const utilProgress =
            utilPlayingId === message.transcriptId
              ? getPlaybackProgress()
              : null;
          const fallbackProgress =
            isPlaying && !utilProgress
              ? {
                  currentMs: message.timestampStart,
                  startMs: message.timestampStart,
                  endMs: message.timestampEnd,
                }
              : null;
          const effective = utilProgress ?? fallbackProgress;
          const clipDurationMs = effective
            ? effective.endMs - effective.startMs
            : 0;
          const clipElapsedMs = effective
            ? Math.max(0, effective.currentMs - effective.startMs)
            : 0;
          const progressFraction =
            clipDurationMs > 0
              ? Math.min(1, clipElapsedMs / clipDurationMs)
              : 0;

          return (
            <div
              key={message.transcriptId}
              className={`flex flex-col gap-1 ${alignment}`}
            >
              <div
                className={`rounded-lg px-4 py-3 max-w-[85%] ${
                  isAgent
                    ? "bg-sky-50/80 text-gray-900 border border-sky-200/70"
                    : "bg-indigo-50 text-gray-900 border border-indigo-200"
                }`}
              >
                {/* Header: label + play button */}
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {isAgent ? "Agent" : "You"}
                  </div>
                  {hasAudio && (
                    <button
                      onClick={() => handlePlay(message)}
                      className={`p-1.5 rounded-full transition-all shadow-sm ${
                        isPlaying
                          ? "bg-indigo-600 text-white"
                          : "bg-white/80 hover:bg-indigo-100 text-gray-600 hover:text-indigo-700"
                      }`}
                      title={isPlaying ? "Stop" : "Play"}
                    >
                      {isPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                    </button>
                  )}
                </div>

                {/* Transcript */}
                <div
                  className="text-sm leading-relaxed whitespace-pre-wrap break-words"
                  dir={isRtl ? "rtl" : "ltr"}
                >
                  {message.transcript}
                </div>

                {/* Player controls — visible only while this message is playing */}
                {isPlaying && (
                  <div className="mt-3 pt-2.5 border-t border-sky-200/70 space-y-2">
                    {/* Scrub bar */}
                    <div
                      className="relative h-1.5 rounded-full cursor-pointer"
                      style={{ background: isAgent ? "#e0f2fe" : "#c7d2fe" }}
                      onClick={handleSeek}
                      title="Click to seek"
                    >
                      {/* Filled portion */}
                      <div
                        className="absolute left-0 top-0 h-full rounded-full bg-indigo-500 transition-none"
                        style={{ width: `${progressFraction * 100}%` }}
                      />
                      {/* Thumb */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-indigo-600 shadow -translate-x-1/2 pointer-events-none"
                        style={{ left: `${progressFraction * 100}%` }}
                      />
                    </div>

                    {/* Time + speed controls */}
                    <div className="flex items-center justify-center">
                      <span className="text-[10px] tabular-nums text-gray-400">
                        {formatClipMs(clipElapsedMs)}
                        <span className="mx-0.5 opacity-50">/</span>
                        {formatClipMs(clipDurationMs)}
                      </span>
                      <div className="flex items-center gap-0.5">
                        {SPEED_OPTIONS.map((r) => (
                          <button
                            key={r}
                            onClick={() => handleSpeedChange(r)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                              speed === r
                                ? "bg-indigo-600 text-white"
                                : "text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                            }`}
                          >
                            {r}×
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <MessageTimestamp timestamp={message.wallClockStart ?? message.timestampStart} />
              </div>
            </div>
          );
        });
        })()}
      </div>
    </div>
  );
}

function MessageTimestamp({ timestamp }: { timestamp: number }) {
  return (
    <div className="mt-2 text-[10px] text-gray-400">
      {formatTimeOnly(timestamp)}
    </div>
  );
}
