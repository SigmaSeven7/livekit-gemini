"use client";

import { Loader2 } from "lucide-react";
import { InterviewDetail } from "./interview-detail";
import { InterviewNotFound } from "./interview-not-found";
import { useInterview } from "@/hooks/use-interviews";

interface InterviewDetailContentProps {
  interviewId: string;
}

export function InterviewDetailContent({ interviewId }: InterviewDetailContentProps) {
    console.log("interviewId", interviewId);
  const { data: interview, isLoading, error } = useInterview(interviewId);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="mt-4 text-sm text-slate-600">Loading interview...</p>
      </div>
    );
  }

  if (error || !interview) {
    return <InterviewNotFound />;
  }

  return <InterviewDetail interview={interview} />;
}