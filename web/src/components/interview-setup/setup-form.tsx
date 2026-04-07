"use client";

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { createInterview } from "@/lib/api/interviews";
import { generateInterviewQuestions } from "@/lib/api/questions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ErrorDialog } from "@/components/ui/error-dialog";
import { Progress } from "@/components/ui/progress";
import {
  ArrowRight,
  ArrowLeft,
  Bot,
  Check,
  Calendar,
  FileText,
  LucideIcon,
  Mic,
  Play,
  Users,
} from "lucide-react";
import { InterviewConfig } from "@/data/interview-options";
import {
  setup_back,
  setup_brand,
  setup_continue,
  setup_error_description,
  setup_error_title,
  setup_practice_session,
  setup_start_interview,
  setup_starting,
  setup_step_candidate_desc,
  setup_step_candidate_title,
  setup_step_context_desc,
  setup_step_context_title,
  setup_step_interviewer_desc,
  setup_step_interviewer_title,
  setup_step_review_desc,
  setup_step_review_title,
} from "@/paraglide/messages";
import { deLocalizeHref, getTextDirection, localizeHref } from "@/paraglide/runtime.js";
import {
  CandidateStep,
  ContextStep,
  InterviewerStep,
  ReviewStep,
} from "./setup-steps";

const SUPPORT_EMAIL =
  import.meta.env.VITE_PUBLIC_SUPPORT_EMAIL || "support@example.com";

export function SetupForm() {
  const isRtl = getTextDirection() === "rtl";
  const BackArrow = isRtl ? ArrowRight : ArrowLeft;
  const ForwardArrow = isRtl ? ArrowLeft : ArrowRight;
  const navigate = useNavigate();
  const steps = useMemo(
    (): { id: number; title: string; description: string; icon: LucideIcon }[] => [
      {
        id: 1,
        title: String(setup_step_interviewer_title()),
        description: String(setup_step_interviewer_desc()),
        icon: Bot,
      },
      {
        id: 2,
        title: String(setup_step_candidate_title()),
        description: String(setup_step_candidate_desc()),
        icon: Users,
      },
      {
        id: 3,
        title: String(setup_step_context_title()),
        description: String(setup_step_context_desc()),
        icon: FileText,
      },
      {
        id: 4,
        title: String(setup_step_review_title()),
        description: String(setup_step_review_desc()),
        icon: Play,
      },
    ],
    [],
  );
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<Partial<InterviewConfig>>({
    interviewer_role: "Tech Lead",
    interviewer_personality: "Warm & Welcoming",
    candidate_role: "Fullstack Developer",
    experience_level: 3,
    job_description: "",
    interview_mode: "Standard",
    interview_pace: "Dynamic",
    difficulty_level: 3,
    company_type: "Corporate/Enterprise",
    interview_language: "English",
    gender_prompt: "Male Interviewer to Male Candidate",
    unspoken_requirements: "",
  });

  const [isCreating, setIsCreating] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleStart = async () => {
    if (isCreating) return;
    setIsCreating(true);

    try {
      const questions = await generateInterviewQuestions(config);
      const interview = await createInterview({
        config,
        status: "in_progress",
        questions,
      });

      const interviewId = interview.id;

      if (!interviewId) {
        console.error("No interview ID in response");
        setIsCreating(false);
        setShowErrorDialog(true);
        return;
      }

      setIsCreating(false);
      const targetPath = localizeHref(`/interview/${interviewId}`);

      if (import.meta.env.DEV) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      navigate({ to: "/interview/$interviewId", params: { interviewId } });

      if (import.meta.env.DEV) {
        window.setTimeout(() => {
          const basePath = deLocalizeHref(window.location.pathname);
          if (!basePath.startsWith("/interview/")) {
            window.location.href = targetPath;
          }
        }, 1200);
      }
    } catch (error) {
      console.error("Error creating interview:", error);
      setIsCreating(false);
      setShowErrorDialog(true);
    }
  };

  const handleChange = (field: keyof InterviewConfig, value: unknown) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const progress = (currentStep / steps.length) * 100;

  if (!mounted) {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b pt-8 border-slate-200/50">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-2 sm:py-4">
          <div className="hidden sm:flex items-center justify-between mb-2 mt-4 sm:mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <Mic className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-800">{String(setup_brand())}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Calendar className="w-4 h-4" />
              <span>{String(setup_practice_session())}</span>
            </div>
          </div>

          <div className={cn("w-full", isRtl && "scale-x-[-1]")}>
            <Progress value={progress} className="h-1.5 bg-slate-100" />
          </div>

          <div className="flex items-center w-full mt-2">
            {steps.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => step.id < currentStep && goToStep(step.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-1 py-1.5 sm:px-2 rounded-lg transition-all",
                    isActive && "bg-indigo-50",
                    isCompleted ? "cursor-pointer hover:bg-slate-50" : "cursor-default",
                    index !== steps.length - 1 && "border-r border-slate-200",
                  )}
                  disabled={!isCompleted}
                >
                  <div
                    className={cn(
                      "w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-semibold transition-all flex-shrink-0",
                      isCompleted && "bg-emerald-500 text-white",
                      isActive && "bg-indigo-600 text-white",
                      !isActive && !isCompleted && "bg-slate-200 text-slate-500",
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[9px] sm:text-xs font-medium whitespace-nowrap hidden xs:inline",
                      isActive ? "text-indigo-700" : "text-slate-500",
                    )}
                  >
                    {step.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pt-5 sm:pt-8 lg:pt-8 pb-20 sm:pb-40 md:pb-44 px-3 sm:px-4 md:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col gap-6 lg:gap-8">
            <div className="lg:col-span-2">
              <div
                key={currentStep}
                className={cn(
                  "transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-4",
                  currentStep,
                )}
              >
                {currentStep === 1 && (
                  <InterviewerStep config={config} onChange={handleChange} />
                )}
                {currentStep === 2 && (
                  <CandidateStep config={config} onChange={handleChange} />
                )}
                {currentStep === 3 && (
                  <ContextStep config={config} onChange={handleChange} />
                )}
                {currentStep === 4 && <ReviewStep config={config} />}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 1}
              className="text-slate-600 hover:text-slate-900 px-2 sm:px-4 border-none !bg-transparent"
            >
              <BackArrow
                className={cn(
                  "w-4 h-4",
                  isRtl ? "ml-1 sm:ml-2" : "mr-1 sm:mr-2",
                )}
              />
              <span className="hidden sm:inline">{String(setup_back())}</span>
            </Button>

            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
              <span className="font-medium">{currentStep}</span>
              <span>/</span>
              <span>{steps.length}</span>
            </div>

            {currentStep < steps.length ? (
              <Button
                onClick={nextStep}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 sm:px-6 rounded-full font-medium text-sm"
              >
                {String(setup_continue())}
                <ForwardArrow
                  className={cn(
                    "w-4 h-4",
                    isRtl ? "mr-1.5 sm:mr-2" : "ml-1.5 sm:ml-2",
                  )}
                />
              </Button>
            ) : (
              <Button
                onClick={handleStart}
                disabled={isCreating}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 sm:px-8 rounded-full font-semibold text-sm shadow-lg shadow-indigo-500/25"
              >
                {isCreating ? (
                  <>
                    <Spinner className="w-4 h-4 mr-2" />
                    {String(setup_starting())}
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-1.5 sm:mr-2" />
                    {String(setup_start_interview())}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      <ErrorDialog
        open={showErrorDialog}
        onOpenChange={setShowErrorDialog}
        title={String(setup_error_title())}
        description={String(setup_error_description({ supportEmail: SUPPORT_EMAIL }))}
      />
    </div>
  );
}
