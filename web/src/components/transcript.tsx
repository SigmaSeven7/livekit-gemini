"use client";

import { useAgent } from "@/hooks/use-agent";
import { useEffect, useRef } from "react";
import { Play } from "lucide-react";

import { Typewriter } from "@/components/typewriter";

export function Transcript() {
  const { displayTranscriptions, playTranscript } = useAgent();
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new transcriptions arrive
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayTranscriptions]);

  if (displayTranscriptions.length === 0) {
    return (
      <div className="flex flex-col h-full w-full text-sm text-fg3 p-4">
        <div className="text-xs font-semibold uppercase tracking-widest mb-2 text-fg2">
          TRANSCRIPT
        </div>
        <div className="text-fg3 italic">No transcriptions yet...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full text-sm p-4 overflow-hidden">
      <div className="text-xs font-semibold uppercase tracking-widest mb-3 text-fg2">
        TRANSCRIPT
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {displayTranscriptions.map((transcription) => {
          const isAgent = transcription.participant?.isAgent ?? false;
          const text = transcription.segment.text;

          if (!text || text.trim().length === 0) {
            return null;
          }

          return (
            <div
              key={transcription.segment.id}
              className={`flex flex-col gap-1 ${isAgent ? "items-start" : "items-end"
                }`}
            >
              <div
                className={`rounded-lg px-3 py-2 max-w-[85%] group relative ${isAgent
                  ? "bg-bg2 text-fg1 border border-separator1"
                  : "bg-bg3 text-fg1 border border-separator1"
                  }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="text-xs font-semibold text-fg2 uppercase tracking-wide">
                    {isAgent ? "Agent" : "You"}
                  </div>
                  <button
                    onClick={() => playTranscript(transcription.segment.id)}
                    className="p-1 hover:bg-white/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                    title="Play audio"
                  >
                    <Play className="w-3 h-3 text-fg2" />
                  </button>
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {isAgent ? (
                    <Typewriter text={text} speed={40} />
                  ) : (
                    text
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={transcriptEndRef} />
      </div>
    </div>
  );
}
