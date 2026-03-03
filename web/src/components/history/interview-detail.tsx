"use client";

import { useState, useEffect, useMemo } from "react";
import { DemiChat } from "./demi-chat";
import { InterviewStatus } from "@/types/conversation";
import { Interview } from "@/types/interview";
import { ConversationMessage } from "@/types/conversation";
import { formatDateLong } from "@/lib/utils/date";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/constants/interview";
import { concatenateMessagesWithSameStartTime } from "@/lib/audio/playback-utils";

interface InterviewDetailProps {
  interview: Interview;
}

interface AudioData {
  audioUrl: string;
  transcripts: ConversationMessage[];
}

export function InterviewDetail({ interview }: InterviewDetailProps) {
  const [showMessages, setShowMessages] = useState(false);
  const [audioData, setAudioData] = useState<AudioData | null>(null);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Fetch audio and transcripts when showing messages
  useEffect(() => {
    if (!showMessages || audioData) return;

    const fetchAudioData = async () => {
      setLoadingAudio(true);
      setAudioError(null);

      try {
        const response = await fetch(
          `http://localhost:3001/getAudioFile?id=${interview.id}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.statusText}`);
        }

        const data = await response.json();
        setAudioData(data);
      } catch (error) {
        console.error("Error fetching audio:", error);
        setAudioError(error instanceof Error ? error.message : "Failed to load audio");
      } finally {
        setLoadingAudio(false);
      }
    };

    fetchAudioData();
  }, [showMessages, interview.id, audioData]);

  // Derive formatted dates during render (no useEffect needed)
  const formattedCreatedAt = formatDateLong(interview.createdAt);
  const formattedUpdatedAt = formatDateLong(interview.updatedAt);

  // Use transcripts from audioData if available, otherwise fall back to interview.transcript
  const rawMessages = audioData?.transcripts || interview.transcript || [];
  
  // Concatenate messages with the same timestampStart
  const messages = useMemo(() => 
    concatenateMessagesWithSameStartTime(rawMessages), 
    [rawMessages]
  );
  
  const audioUrl = audioData?.audioUrl;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Interview Details</h1>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${STATUS_COLORS[interview.status]}`}>
                {STATUS_LABELS[interview.status]}
              </span>
              <span className="text-xs text-slate-500 font-mono">{interview.id}</span>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
              Created At
            </label>
            <p className="text-sm text-slate-700" suppressHydrationWarning>{formattedCreatedAt}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
              Updated At
            </label>
            <p className="text-sm text-slate-700" suppressHydrationWarning>{formattedUpdatedAt}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
              Messages
            </label>
            <p className="text-sm text-slate-700">{messages.length} {messages.length === 1 ? 'message' : 'messages'}</p>
          </div>
        </div>
      </div>

      {/* Config Card */}
      {interview.config && Object.keys(interview.config).length > 0 && (
        <div className="bg-white border border-slate-100 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Configuration</h2>
          <div className="space-y-3">
            {Object.entries(interview.config).map(([key, value]) => {
              if (value === null || value === undefined) return null;
              
              const displayKey = key
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (l) => l.toUpperCase());
              
              return (
                <div key={key} className="flex items-start gap-4 py-2 border-b border-slate-50 last:border-0">
                  <div className="w-32 flex-shrink-0">
                    <span className="text-xs font-medium text-slate-600">{displayKey}</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-slate-700">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Messages Section */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Conversation</h2>
          <button
            onClick={() => setShowMessages(!showMessages)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            {showMessages ? 'Hide Messages' : 'Show Messages'}
          </button>
        </div>

        {showMessages && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            {loadingAudio && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                <span className="ml-3 text-slate-500">Loading audio...</span>
              </div>
            )}
            {audioError && (
              <div className="text-center py-8 text-red-500">
                <p>Error loading audio: {audioError}</p>
              </div>
            )}
            {!loadingAudio && !audioError && (
              <div className="h-[600px]">
                <DemiChat messages={messages} audioUrl={audioUrl} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
