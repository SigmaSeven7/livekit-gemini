"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { ConversationMessage } from "@/types/conversation";
import { playAudioFromUrl, playAudioFromBase64 } from "@/lib/audio/playback-utils";
import { formatTimeOnly } from "@/lib/utils/date";

interface DemiChatProps {
  messages: ConversationMessage[];
}

export function DemiChat({ messages }: DemiChatProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);

  const handlePlay = async (message: ConversationMessage) => {
    if (playingId === message.transcriptId) {
      return; // Already playing
    }

    setPlayingId(message.transcriptId);

    try {
      // Try audioUrl first, then fallback to audioBase64
      if (message.audioUrl) {
        await playAudioFromUrl(message.audioUrl);
      } else if (message.audioBase64) {
        await playAudioFromBase64(message.audioBase64);
      } else {
        console.warn('No audio available for message:', message.transcriptId);
      }
    } catch (error) {
      console.error('Failed to play audio:', error);
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
          const isAgent = message.participant === 'agent';
          const hasAudio = !!(message.audioUrl || message.audioBase64);
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
                      disabled={isPlaying}
                      className={`p-1.5 rounded-full transition-all ${
                        isPlaying
                          ? "bg-indigo-600 text-white"
                          : "bg-white/80 hover:bg-indigo-100 text-slate-600 hover:text-indigo-700"
                      } shadow-sm`}
                      title="Play audio"
                    >
                      <Play className={`w-3.5 h-3.5 ${isPlaying ? "fill-current" : ""}`} />
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
  // Derive formatted time during render (no useEffect needed)
  const formattedTime = formatTimeOnly(timestamp);

  return (
    <div className="mt-2 text-[10px] text-slate-400">
      {formattedTime}
    </div>
  );
}
