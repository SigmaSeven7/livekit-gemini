"use client";

import { useState, useMemo } from "react";
import { DemiChat } from "./demi-chat";
import { Interview } from "@/types/interview";
import { formatDateLong } from "@/lib/utils/date";
import { STATUS_COLORS } from "@/lib/constants/interview";
import { interviewStatusLabel } from "@/lib/interview-status-label";
import {
  interview_configuration,
  interview_created_at,
  interview_detail_heading,
  interview_message_one,
  interview_messages_label,
  interview_messages_other,
  interview_updated_at,
} from "@/paraglide/messages";
import { concatenateMessagesWithSameStartTime } from "@/lib/audio/playback-utils";

interface InterviewDetailProps {
  interview: Interview;
}

export function InterviewDetail({ interview }: InterviewDetailProps) {
  const [showMessages, setShowMessages] = useState(false);

  // Derive formatted dates during render (no useEffect needed)
  const formattedCreatedAt = formatDateLong(interview.createdAt);
  const formattedUpdatedAt = formatDateLong(interview.updatedAt);

  const messages = useMemo(() => {
    const raw =
      interview.processedTranscript || interview.transcript || [];
    return concatenateMessagesWithSameStartTime(raw);
  }, [interview.processedTranscript, interview.transcript]);

  const audioUrl = interview.audioUrl;

  const isRtl =
    interview.config?.interview_language === "Hebrew" ||
    interview.config?.interview_language === "Arabic";

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white/90 border border-sky-200/50 rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{String(interview_detail_heading())}</h1>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${STATUS_COLORS[interview.status]}`}>
                {interviewStatusLabel(interview.status)}
              </span>
              <span className="text-xs text-gray-500 font-mono">{interview.id}</span>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-sky-100">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
              {String(interview_created_at())}
            </label>
            <p className="text-sm text-gray-700" suppressHydrationWarning>{formattedCreatedAt}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
              {String(interview_updated_at())}
            </label>
            <p className="text-sm text-gray-700" suppressHydrationWarning>{formattedUpdatedAt}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
              {String(interview_messages_label())}
            </label>
            <p className="text-sm text-gray-700">
              {messages.length}{" "}
              {messages.length === 1
                ? String(interview_message_one())
                : String(interview_messages_other())}
            </p>
          </div>
        </div>
      </div>

      {/* Config Card */}
      {interview.config && Object.keys(interview.config).length > 0 && (
        <div className="bg-white/90 border border-sky-200/50 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{String(interview_configuration())}</h2>
          <div className="space-y-3">
            {Object.entries(interview.config).map(([key, value]) => {
              if (value === null || value === undefined) return null;
              
              const displayKey = key
                .replace(/_/g, ' ')
                .replace(/\b\w/g, (l) => l.toUpperCase());
              
              return (
                <div key={key} className="flex items-start gap-4 py-2 border-b border-sky-50 last:border-0">
                  <div className="w-32 flex-shrink-0">
                    <span className="text-xs font-medium text-gray-600">{displayKey}</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-gray-700">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Questions Section */}
      {interview.questions && interview.questions.length > 0 && (
        <div className="bg-white/90 border border-sky-200/50 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Interview Questions
            <span className="ml-2 text-sm font-normal text-gray-400">({interview.questions.length})</span>
          </h2>
          <div className="space-y-4" dir={isRtl ? "rtl" : "ltr"}>
            {interview.questions.map((q, idx) => (
              <div key={idx} className="border border-sky-100 rounded-xl p-4">
                <div className="flex items-start gap-3 mb-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100/80 text-gray-600 font-medium">
                        {q.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 leading-relaxed">{q.question}</p>
                  </div>
                </div>
                {q.hints && q.hints.length > 0 && (
                  <div className="ms-9 space-y-1">
                    {q.hints.map((hint, hIdx) => (
                      <p key={hIdx} className="text-xs text-gray-500 flex items-start gap-1.5">
                        <span className="text-indigo-300 mt-0.5">›</span>
                        {hint}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages Section */}
      <div className="bg-white/90 border border-sky-200/50 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Conversation</h2>
          <button
            onClick={() => setShowMessages(!showMessages)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            {showMessages ? 'Hide Messages' : 'Show Messages'}
          </button>
        </div>

        {showMessages && (
          <div className="mt-6 pt-6 border-t border-sky-100">
            <div className="h-[600px]">
              <DemiChat messages={messages} audioUrl={audioUrl || undefined} isRtl={isRtl} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
