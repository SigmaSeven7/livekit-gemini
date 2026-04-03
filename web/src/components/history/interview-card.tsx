"use client";

import { Link } from "@tanstack/react-router";
import { Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { InterviewStatus } from "@/types/conversation";
import { formatDateShort } from "@/lib/utils/date";
import { getTextDirection } from "@/paraglide/runtime.js";
import { STATUS_COLORS } from "@/lib/constants/interview";
import { interviewStatusLabel } from "@/lib/interview-status-label";
import {
  card_delete_title,
  card_deselect,
  card_select,
  card_view_details,
  interview_message_one,
  interview_messages_other,
} from "@/paraglide/messages";

interface InterviewCardProps {
  id: string;
  status: InterviewStatus;
  createdAt: Date | string;
  messageCount: number;
  config: Record<string, unknown> | null;
  onDelete?: (id: string) => void;
  isDeleting?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
}

export function InterviewCard({ id, status, createdAt, messageCount, config, onDelete, isDeleting, isSelected, onSelect }: InterviewCardProps) {
  const isRtl = getTextDirection() === "rtl";
  // LTR: select left, trash right. RTL (he/ar): trash left, select/check right — physical sides.
  const selectBtnClass = isRtl ? "right-4" : "left-4";
  const deleteBtnClass = isRtl ? "left-4" : "right-4";

  // Derive formatted date during render (no useEffect needed)
  const formattedDate = formatDateShort(createdAt);

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

  const handleSelectClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(id, !isSelected);
  };

  return (
    <Link to="/history/$interviewId" params={{ interviewId: id }}>
      <div className={`bg-white/90 border rounded-2xl p-6 hover:shadow-lg transition-all cursor-pointer group relative shadow-sm ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-sky-200/50'}`}>
        {/* Selection checkbox */}
        {onSelect && (
          <button
            onClick={handleSelectClick}
            className={`absolute top-4 ${selectBtnClass} w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors z-10 ${
              isSelected 
                ? 'bg-indigo-600 border-indigo-600' 
                : 'border-sky-200 hover:border-indigo-400'
            }`}
            title={isSelected ? String(card_deselect()) : String(card_select())}
          >
            {isSelected && <Check className="w-4 h-4 text-white" />}
          </button>
        )}

        {/* Delete button */}
        {onDelete && (
          <button
            onClick={handleDeleteClick}
            disabled={isDeleting}
            className={`absolute top-4 ${deleteBtnClass} p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed z-10`}
            title={String(card_delete_title())}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <div className="flex items-start justify-between mb-4">
          <div
            className={cn(
              "flex-1 min-w-0 text-start",
              onSelect && onDelete && "px-8",
              onSelect && !onDelete && (isRtl ? "pr-8" : "pl-8"),
              onDelete && !onSelect && (isRtl ? "pl-8" : "pr-8"),
            )}
          >
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`px-2 py-1 rounded-lg text-xs font-semibold border ${STATUS_COLORS[status]}`}>
                {interviewStatusLabel(status)}
              </span>
              <span className="text-xs text-gray-500 font-mono truncate">
                {id.slice(0, 8)}...
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-1" suppressHydrationWarning>{formattedDate}</p>
            <p className="text-sm text-slate-600">
              {messageCount}{" "}
              {messageCount === 1
                ? String(interview_message_one())
                : String(interview_messages_other())}
            </p>
          </div>
        </div>
        
        {configSummary && (configSummary.role || configSummary.mode) && (
          <div className="mt-4 pt-4 border-t border-sky-100">
            <div className="flex flex-wrap gap-2">
              {configSummary.role && (
                <span className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg">
                  {String(configSummary.role)}
                </span>
              )}
              {configSummary.mode && (
                <span className="text-xs px-2 py-1 bg-sky-50/80 text-gray-600 rounded-lg">
                  {String(configSummary.mode)}
                </span>
              )}
            </div>
          </div>
        )}
        
        <div className="mt-4 flex items-center justify-between border-t border-sky-100 pt-4">
          <span className="inline-flex items-center gap-1 text-xs text-gray-400 transition-colors group-hover:text-indigo-600">
            <span>{String(card_view_details())}</span>
            <span aria-hidden className="inline-block rtl:rotate-180">
              →
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
