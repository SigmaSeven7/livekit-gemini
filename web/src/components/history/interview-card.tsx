"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { InterviewStatus } from "@/types/conversation";

interface InterviewCardProps {
  id: string;
  status: InterviewStatus;
  createdAt: Date | string;
  messageCount: number;
  config: Record<string, unknown> | null;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
}

export function InterviewCard({ id, status, createdAt, messageCount, config, onDelete, isDeleting }: InterviewCardProps) {
  const [formattedDate, setFormattedDate] = useState<string>('');

  useEffect(() => {
    const date = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
    const formatted = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
    setFormattedDate(formatted);
  }, [createdAt]);
  
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

  // Extract key config info for display
  const configSummary = config ? {
    role: config.candidate_role || config.interviewer_role || null,
    mode: config.interview_mode || null,
  } : null;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.(id);
  };

  return (
    <Link href={`/history/${id}`}>
      <div className="bg-white border border-slate-100 rounded-2xl p-6 hover:shadow-lg transition-all cursor-pointer group relative">
        {onDelete && (
          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className="absolute top-4 right-4 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10"
            title="Delete interview"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 pr-8">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-1 rounded-lg text-xs font-semibold border ${statusColors[status]}`}>
                {statusLabels[status]}
              </span>
              <span className="text-xs text-slate-500 font-mono truncate">
                {id.slice(0, 8)}...
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-1" suppressHydrationWarning>{formattedDate || ''}</p>
            <p className="text-sm text-slate-600">
              {messageCount} {messageCount === 1 ? 'message' : 'messages'}
            </p>
          </div>
        </div>
        
        {configSummary && (configSummary.role || configSummary.mode) && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex flex-wrap gap-2">
              {configSummary.role && (
                <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg">
                  {String(configSummary.role)}
                </span>
              )}
              {configSummary.mode && (
                <span className="text-xs px-2 py-1 bg-slate-50 text-slate-600 rounded-lg">
                  {String(configSummary.mode)}
                </span>
              )}
            </div>
          </div>
        )}
        
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400 group-hover:text-indigo-600 transition-colors">
            View Details →
          </span>
        </div>
      </div>
    </Link>
  );
}
