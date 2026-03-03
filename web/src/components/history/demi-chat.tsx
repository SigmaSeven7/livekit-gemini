"use client";

import { useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import { ConversationMessage } from "@/types/conversation";
import { playAudioFromUrlWithTimestamp, stopAudio, getPlayingMessageId } from "@/lib/audio/playback-utils";
import { formatTimeOnly } from "@/lib/utils/date";

interface DemiChatProps {
  messages: ConversationMessage[];
  audioUrl?: string;
}

export function DemiChat({ messages, audioUrl }: DemiChatProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Update playing state from the singleton
  useEffect(() => {
    const checkPlaying = () => {
      const currentPlayingId = getPlayingMessageId();
      setPlayingId(currentPlayingId);
    };

    const interval = setInterval(checkPlaying, 100);
    return () => clearInterval(interval);
  }, []);

  const handlePlay = async (message: ConversationMessage) => {
    // If this message is already playing, stop it
    if (playingId === message.transcriptId) {
      stopAudio();
      setPlayingId(null);
      return;
    }

    // If no audio URL provided, warn
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
        message.transcriptId
      );
    } catch (error) {
      console.error("Failed to play audio:", error);
    } finally {
      setPlayingId(null);
    }
  };

  if (messages.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-sm">No messages in this interview</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="text-xs font-semibold uppercase tracking-widest mb-4 text-slate-500 px-2">
        Conversation ({messages.length} messages)
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((message) => {
          const isAgent = message.participant === "agent" || message.participant === "user";
          const hasAudio = !!audioUrl;
          const isPlaying = playingId === message.transcriptId;

          return (
            <div
              key={message.transcriptId}
              className={`flex flex-col gap-1 ${isAgent ? "items-start" : "items-end"}`}
            >
              <div
                className={`rounded-lg px-4 py-3 max-w-[85%] group relative ${
                  isAgent
                    ? "bg-slate-50 text-slate-900 border border-slate-200"
                    : "bg-indigo-50 text-slate-900 border border-indigo-200"
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                    {isAgent ? "Agent" : "You"}
                  </div>
                  {hasAudio && (
                    <button
                      onClick={() => handlePlay(message)}
                      className={`p-1.5 rounded-full transition-all ${
                        isPlaying
                          ? "bg-indigo-600 text-white"
                          : "bg-white/80 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700"
                      } shadow-sm`}
                      title={isPlaying ? "Stop audio" : "Play audio"}
                    >
                      {isPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      )}
                    </button>
                  )}
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {message.transcript}
                </div>
                <MessageTimestamp timestamp={message.timestampStart} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MessageTimestamp({ timestamp }: { timestamp: number }) {
  const formattedTime = formatTimeOnly(timestamp);

  return (
    <div className="mt-2 text-[10px] text-slate-400">
      {formattedTime}
    </div>
  );
}
