/**
 * Shared constants for interview components
 * Hoisted outside components to avoid recreation (rendering-hoist-jsx pattern)
 */

import { InterviewStatus } from '@/types/conversation';

export const STATUS_COLORS: Record<InterviewStatus, string> = {
  completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
  paused: 'bg-slate-100 text-slate-700 border-slate-200',
};

export const STATUS_LABELS: Record<InterviewStatus, string> = {
  completed: 'Completed',
  in_progress: 'In Progress',
  paused: 'Paused',
};
