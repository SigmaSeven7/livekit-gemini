"use client";

import { useState, useEffect } from "react";
import { DemiChat } from "./demi-chat";
import { InterviewStatus, ConversationMessage } from "@/types/conversation";

interface InterviewDetailProps {
  interview: {
    id: string;
    createdAt: string;
    updatedAt: string;
    status: InterviewStatus;
    config: Record<string, unknown> | null;
    messages: ConversationMessage[];
  };
}

export function InterviewDetail({ interview }: InterviewDetailProps) {
  const [showMessages, setShowMessages] = useState(false);
  const [formattedCreatedAt, setFormattedCreatedAt] = useState<string>('');
  const [formattedUpdatedAt, setFormattedUpdatedAt] = useState<string>('');

  const statusColors = {
    completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
    paused: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const statusLabels = {
    completed: 'Completed',
    in_progress: 'In Progress',
    paused: 'Paused',
  };

  useEffect(() => {
    const createdAt = new Date(interview.createdAt);
    const updatedAt = new Date(interview.updatedAt);
    
    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'long',
        timeStyle: 'short',
      }).format(date);
    };

    setFormattedCreatedAt(formatDate(createdAt));
    setFormattedUpdatedAt(formatDate(updatedAt));
  }, [interview.createdAt, interview.updatedAt]);

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Interview Details</h1>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-lg text-xs font-semibold border ${statusColors[interview.status]}`}>
                {statusLabels[interview.status]}
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
            <p className="text-sm text-slate-700" suppressHydrationWarning>{formattedCreatedAt || 'Loading...'}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
              Updated At
            </label>
            <p className="text-sm text-slate-700" suppressHydrationWarning>{formattedUpdatedAt || 'Loading...'}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 block">
              Messages
            </label>
            <p className="text-sm text-slate-700">{interview.messages.length} {interview.messages.length === 1 ? 'message' : 'messages'}</p>
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
            <div className="h-[600px]">
              <DemiChat messages={interview.messages} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
