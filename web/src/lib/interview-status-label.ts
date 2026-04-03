import {
  status_completed,
  status_in_progress,
  status_paused,
} from "@/paraglide/messages";
import type { InterviewStatus } from "@/types/conversation";

export function interviewStatusLabel(status: InterviewStatus): string {
  switch (status) {
    case "completed":
      return String(status_completed());
    case "in_progress":
      return String(status_in_progress());
    case "paused":
      return String(status_paused());
    default:
      return status;
  }
}
