"use client";

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ErrorDialog } from "@/components/ui/error-dialog";
import { Progress } from "@/components/ui/progress";
import {
    ArrowRight,
    ArrowLeft,
    Check,
    Sparkles,
    Languages,
    Building2,
    EyeOff,
    Users,
    FileText,
    Play,
    Bot,
    Mic,
    Calendar,
    LucideIcon,
} from "lucide-react";
import {
    INTERVIEWER_ROLES,
    INTERVIEWER_PERSONALITIES,
    INTERVIEW_MODES,
    INTERVIEW_LANGUAGES,
    GENDER_PROMPTS,
    COMPANY_TYPES,
    InterviewConfig,
} from "@/data/interview-options";
import {
    companyTypeLabel,
    genderPromptLabel,
    interviewLanguageLabel,
    interviewModeLabel,
    interviewerPersonalityLabel,
    interviewerRoleLabel,
} from "@/lib/interview-option-labels";
import {
    setup_back,
    setup_before_start_body,
    setup_before_start_title,
    setup_brand,
    setup_candidate_subtitle,
    setup_candidate_title,
    setup_company_type,
    setup_configure_interviewer_subtitle,
    setup_configure_interviewer_title,
    setup_context_subtitle,
    setup_context_title,
    setup_continue,
    setup_diff_beginner,
    setup_diff_challenging,
    setup_diff_easy,
    setup_diff_expert,
    setup_diff_moderate,
    setup_difficulty,
    setup_error_description,
    setup_error_title,
    setup_exp_01,
    setup_exp_10p,
    setup_exp_13,
    setup_exp_35,
    setup_exp_510,
    setup_gender_presentation,
    setup_hidden_criteria,
    setup_hidden_placeholder,
    setup_hidden_tooltip,
    setup_interview_language,
    setup_interview_mode,
    setup_interviewer_personality,
    setup_interviewer_role,
    setup_job_description,
    setup_job_hint,
    setup_job_placeholder,
    setup_placeholder_role,
    setup_practice_session,
    setup_review_candidate,
    setup_review_company,
    setup_review_difficulty,
    setup_review_experience,
    setup_review_job_desc,
    setup_review_language,
    setup_review_level,
    setup_review_mode,
    setup_review_subtitle,
    setup_review_title,
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
    setup_target_position,
    setup_years_experience,
    setup_year_one,
    setup_years_other,
    setup_years_suffix,
} from "@/paraglide/messages";
import { deLocalizeHref, getTextDirection, localizeHref } from "@/paraglide/runtime.js";

const SUPPORT_EMAIL =
  import.meta.env.VITE_PUBLIC_SUPPORT_EMAIL || "support@example.com";

/** Shared selectable option style (matches Interviewer Role chips) */
const choiceBtnBase =
    "py-3 sm:py-4 px-2 sm:px-3 rounded-xl border-2 transition-all font-medium text-xs sm:text-sm";
const choiceBtnOn = "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md shadow-indigo-100";
const choiceBtnOff = "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white";

export function SetupForm() {
    const isRtl = getTextDirection() === "rtl";
    const BackArrow = isRtl ? ArrowRight : ArrowLeft;
    const ForwardArrow = isRtl ? ArrowLeft : ArrowRight;
    const navigate = useNavigate();
    const steps = useMemo(
        (): { id: number; title: string; description: string; icon: LucideIcon }[] => [
            { id: 1, title: String(setup_step_interviewer_title()), description: String(setup_step_interviewer_desc()), icon: Bot },
            { id: 2, title: String(setup_step_candidate_title()), description: String(setup_step_candidate_desc()), icon: Users },
            { id: 3, title: String(setup_step_context_title()), description: String(setup_step_context_desc()), icon: FileText },
            { id: 4, title: String(setup_step_review_title()), description: String(setup_step_review_desc()), icon: Play },
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
        unspoken_requirements: ""
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
            const genResponse = await fetch('/api/questions/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config }),
            });

            if (!genResponse.ok) {
                throw new Error('Failed to generate interview questions');
            }

            const genData = await genResponse.json();
            const questions = genData.questions || [];

            const response = await fetch('/api/interviews', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    config,
                    status: 'in_progress',
                    questions,
                }),
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => null);
                console.error('Failed to create interview:', errorBody);
                setIsCreating(false);
                setShowErrorDialog(true);
                return;
            }

            const interview = await response.json();
            const interviewId = interview.id;

            if (!interviewId) {
                console.error('No interview ID in response');
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
            console.error('Error creating interview:', error);
            setIsCreating(false);
            setShowErrorDialog(true);
        }
    };

    const handleChange = (field: keyof InterviewConfig, value: any) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const goToStep = (step: number) => {
        setCurrentStep(step);
    };

    const nextStep = () => {
        if (currentStep < steps.length) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const progress = (currentStep / steps.length) * 100;

    if (!mounted) {
        return null;
    }

    return (
        <div className="w-full bg-gradient-to-br from-slate-50 via-white to-slate-100">
            {/* Top Progress Bar */}
            <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b pt-8 border-slate-200/50">
                <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-2 sm:py-4">
                    {/* Logo & Title Row - Hidden on mobile, visible on sm+ */}
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
                    
                    {/* Progress Bar — mirror in RTL so fill runs right-to-left */}
                    <div
                        className={cn("w-full", isRtl && "scale-x-[-1]")}
                    >
                        <Progress value={progress} className="h-1.5 bg-slate-100" />
                    </div>
                    
                    {/* Step Indicators */}
                    <div className="flex items-center w-full mt-2">
                        {steps.map((step, index) => {
                            const isActive = step.id === currentStep;
                            const isCompleted = step.id < currentStep;
                            return (
                                <button
                                    key={step.id}
                                    onClick={() => step.id < currentStep && goToStep(step.id)}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-1 py-1.5 sm:px-2 rounded-lg transition-all",
                                        isActive && "bg-indigo-50",
                                        isCompleted ? "cursor-pointer hover:bg-slate-50" : "cursor-default",
                                        index !== steps.length - 1 && "border-r border-slate-200"
                                    )}
                                    disabled={!isCompleted}
                                >
                                    <div className={cn(
                                        "w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-semibold transition-all flex-shrink-0",
                                        isCompleted && "bg-emerald-500 text-white",
                                        isActive && "bg-indigo-600 text-white",
                                        !isActive && !isCompleted && "bg-slate-200 text-slate-500"
                                    )}>
                                        {isCompleted ? <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> : step.id}
                                    </div>
                                    <span className={cn(
                                        "text-[9px] sm:text-xs font-medium whitespace-nowrap hidden xs:inline",
                                        isActive ? "text-indigo-700" : "text-slate-500"
                                    )}>
                                        {step.title}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="pt-5 sm:pt-8 lg:pt-8 pb-20 sm:pb-40 md:pb-44 px-3 sm:px-4 md:px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="flex flex-col gap-6 lg:gap-8">
                        {/* Form Area */}
                        <div className="lg:col-span-2">
                            <div 
                                key={currentStep}
                                className={cn(
                                    "transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-4",
                                    currentStep
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
                                {currentStep === 4 && (
                                    <ReviewStep config={config} />
                                )}
                            </div>
                        </div>

                        {/* Summary Sidebar - Desktop Only */}
                        {/* <div className="hidden lg:block">
                            <div className="sticky top-28 bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-5">
                                <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
                                    <Settings2 className="w-4 h-4 text-indigo-600" />
                                    Session Summary
                                </h3>
                                <div className="space-y-3">
                                    <SummaryItem 
                                        label="Interviewer" 
                                        value={config.interviewer_role} 
                                        icon={Bot}
                                        color="text-indigo-600"
                                        bgColor="bg-indigo-50"
                                    />
                                    <SummaryItem 
                                        label="Personality" 
                                        value={config.interviewer_personality} 
                                        icon={User}
                                        color="text-purple-600"
                                        bgColor="bg-purple-50"
                                    />
                                    <SummaryItem 
                                        label="Candidate Role" 
                                        value={config.candidate_role} 
                                        icon={Briefcase}
                                        color="text-emerald-600"
                                        bgColor="bg-emerald-50"
                                    />
                                    <SummaryItem 
                                        label="Experience" 
                                        value={`${experienceValueMap[config.experience_level || 3]} years`} 
                                        icon={Calendar}
                                        color="text-amber-600"
                                        bgColor="bg-amber-50"
                                    />
                                    <SummaryItem 
                                        label="Mode" 
                                        value={config.interview_mode} 
                                        icon={Settings2}
                                        color="text-rose-600"
                                        bgColor="bg-rose-50"
                                    />
                                    <SummaryItem 
                                        label="Difficulty" 
                                        value={`Level ${config.difficulty_level}/5`} 
                                        icon={Sparkles}
                                        color="text-cyan-600"
                                        bgColor="bg-cyan-50"
                                    />
                                </div>
                            </div>
                        </div> */}
                    </div>
                </div>
            </div>

            {/* Bottom Navigation */}
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

function difficultyLevelLabel(level: number | undefined): string {
    const l = level ?? 3;
    if (l === 1) return String(setup_diff_easy());
    if (l === 2) return String(setup_diff_beginner());
    if (l === 3) return String(setup_diff_moderate());
    if (l === 4) return String(setup_diff_challenging());
    return String(setup_diff_expert());
}

function experienceRangeLabel(level: number | undefined): string {
    const l = level ?? 3;
    if (l === 1) return String(setup_exp_01());
    if (l === 2) return String(setup_exp_13());
    if (l === 3) return String(setup_exp_35());
    if (l === 4) return String(setup_exp_510());
    return String(setup_exp_10p());
}

// Step 1: Interviewer Configuration
function InterviewerStep({ config, onChange }: { 
    config: Partial<InterviewConfig>; 
    onChange: (field: keyof InterviewConfig, value: any) => void;
}) {
    return (
        <div className="space-y-5 sm:space-y-6 lg:space-y-8">
            <div className="space-y-1.5 sm:space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{String(setup_configure_interviewer_title())}</h2>
                <p className="text-sm sm:text-base text-slate-500">{String(setup_configure_interviewer_subtitle())}</p>
            </div>

            {/* Interviewer Role */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                <label className="text-sm font-semibold text-slate-700 mb-3 sm:mb-4 block">{String(setup_interviewer_role())}</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                    {INTERVIEWER_ROLES.map((role) => (
                        <button
                            key={role.id}
                            type="button"
                            onClick={() => onChange("interviewer_role", role.id)}
                            className={cn(
                                choiceBtnBase,
                                config.interviewer_role === role.id ? choiceBtnOn : choiceBtnOff,
                            )}
                        >
                            {interviewerRoleLabel(role.id)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Personality */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                <label className="text-sm font-semibold text-slate-700 mb-3 sm:mb-4 block">{String(setup_interviewer_personality())}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {INTERVIEWER_PERSONALITIES.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            onClick={() => onChange("interviewer_personality", p.id)}
                            className={cn(
                                choiceBtnBase,
                                "text-center",
                                config.interviewer_personality === p.id ? choiceBtnOn : choiceBtnOff,
                            )}
                        >
                            {interviewerPersonalityLabel(p.id)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Gender & Pronouns */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                <label className="text-sm font-semibold text-slate-700 mb-3 sm:mb-4 block">{String(setup_gender_presentation())}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {GENDER_PROMPTS.map((g) => (
                        <button
                            key={g.id}
                            type="button"
                            onClick={() => onChange("gender_prompt", g.id)}
                            className={cn(
                                choiceBtnBase,
                                "text-center",
                                config.gender_prompt === g.id ? choiceBtnOn : choiceBtnOff,
                            )}
                        >
                            {genderPromptLabel(g.id)}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Step 2: Candidate Configuration
function CandidateStep({ config, onChange }: { 
    config: Partial<InterviewConfig>; 
    onChange: (field: keyof InterviewConfig, value: any) => void;
}) {
    const exp = config.experience_level ?? 3;
    return (
        <div className="space-y-5 sm:space-y-6 lg:space-y-8">
            <div className="space-y-1.5 sm:space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{String(setup_candidate_title())}</h2>
                <p className="text-sm sm:text-base text-slate-500">{String(setup_candidate_subtitle())}</p>
            </div>

            {/* Target Position */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                <label className="text-sm font-semibold text-slate-700 mb-3 sm:mb-4 block">{String(setup_target_position())}</label>
                <input
                    type="text"
                    value={config.candidate_role}
                    onChange={(e) => onChange("candidate_role", e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:border-indigo-600 focus:bg-white outline-none transition-all font-medium text-sm sm:text-base"
                    placeholder={String(setup_placeholder_role())}
                />
            </div>

            {/* Experience Level */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <label className="text-sm font-semibold text-slate-700">{String(setup_years_experience())}</label>
                    <span className="px-2.5 sm:px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs sm:text-sm font-semibold">
                        {config.experience_level}{" "}
                        {exp === 1 ? String(setup_year_one()) : String(setup_years_other())}
                    </span>
                </div>
                <input
                    type="range"
                    min="1"
                    max="5"
                    value={config.experience_level}
                    onChange={(e) => onChange("experience_level", parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between mt-2 text-[10px] sm:text-xs text-slate-500">
                    <span>{String(setup_exp_01())}</span>
                    <span>{String(setup_exp_13())}</span>
                    <span>{String(setup_exp_35())}</span>
                    <span>{String(setup_exp_510())}</span>
                    <span>{String(setup_exp_10p())}</span>
                </div>
            </div>

            {/* Difficulty */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <label className="text-sm font-semibold text-slate-700">{String(setup_difficulty())}</label>
                    <span className={cn(
                        "px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold",
                        config.difficulty_level === 1 && "bg-emerald-100 text-emerald-700",
                        config.difficulty_level === 2 && "bg-lime-100 text-lime-700",
                        config.difficulty_level === 3 && "bg-amber-100 text-amber-700",
                        config.difficulty_level === 4 && "bg-orange-100 text-orange-700",
                        config.difficulty_level === 5 && "bg-red-100 text-red-700"
                    )}>
                        {difficultyLevelLabel(config.difficulty_level)}
                    </span>
                </div>
                <input
                    type="range"
                    min="1"
                    max="5"
                    value={config.difficulty_level}
                    onChange={(e) => onChange("difficulty_level", parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between mt-2 text-[10px] sm:text-xs text-slate-500">
                    <span>{String(setup_diff_easy())}</span>
                    <span>{String(setup_diff_moderate())}</span>
                    <span>{String(setup_diff_expert())}</span>
                </div>
            </div>

            {/* Mode */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                <label className="text-sm font-semibold text-slate-700 mb-3 sm:mb-4 block">{String(setup_interview_mode())}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {INTERVIEW_MODES.map((m) => (
                        <button
                            key={m.id}
                            type="button"
                            onClick={() => onChange("interview_mode", m.id)}
                            className={cn(
                                choiceBtnBase,
                                "text-center",
                                config.interview_mode === m.id ? choiceBtnOn : choiceBtnOff,
                            )}
                        >
                            {interviewModeLabel(m.id)}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// Step 3: Context
function ContextStep({ config, onChange }: { 
    config: Partial<InterviewConfig>; 
    onChange: (field: keyof InterviewConfig, value: any) => void;
}) {
    return (
        <div className="space-y-5 sm:space-y-6 lg:space-y-8">
            <div className="space-y-1.5 sm:space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{String(setup_context_title())}</h2>
                <p className="text-sm sm:text-base text-slate-500">{String(setup_context_subtitle())}</p>
            </div>

            {/* Job Description */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                <label className="text-sm font-semibold text-slate-700 mb-3 sm:mb-4 block flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    {String(setup_job_description())}
                </label>
                <textarea
                    value={config.job_description}
                    onChange={(e) => onChange("job_description", e.target.value)}
                    className="w-full h-24 sm:h-32 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:border-indigo-600 focus:bg-white outline-none transition-all text-sm resize-none"
                    placeholder={String(setup_job_placeholder())}
                />
                <p className="text-xs text-slate-400 mt-2">{String(setup_job_hint())}</p>
            </div>

            {/* Company Type */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                <label className="text-sm font-semibold text-slate-700 mb-3 sm:mb-4 block flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    {String(setup_company_type())}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                    {COMPANY_TYPES.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            onClick={() => onChange("company_type", t.id)}
                            className={cn(
                                choiceBtnBase,
                                "text-center",
                                config.company_type === t.id ? choiceBtnOn : choiceBtnOff,
                            )}
                        >
                            {companyTypeLabel(t.id)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Language */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                <label className="text-sm font-semibold text-slate-700 mb-3 sm:mb-4 block flex items-center gap-2">
                    <Languages className="w-4 h-4 text-slate-400" />
                    {String(setup_interview_language())}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    {INTERVIEW_LANGUAGES.map((l) => (
                        <button
                            key={l.id}
                            type="button"
                            onClick={() => onChange("interview_language", l.id)}
                            className={cn(
                                choiceBtnBase,
                                "text-center",
                                config.interview_language === l.id ? choiceBtnOn : choiceBtnOff,
                            )}
                        >
                            {interviewLanguageLabel(l.id)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Hidden Agenda */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                <label className="text-sm font-semibold text-slate-700 mb-3 sm:mb-4 block flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-slate-400" />
                    {String(setup_hidden_criteria())}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button type="button" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors">
                                <span className="text-xs font-bold">?</span>
                            </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                            <p className="text-xs">
                                {String(setup_hidden_tooltip())}
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </label>
                <input
                    type="text"
                    value={config.unspoken_requirements}
                    onChange={(e) => onChange("unspoken_requirements", e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:border-indigo-600 focus:bg-white outline-none transition-all font-medium text-sm"
                    placeholder={String(setup_hidden_placeholder())}
                />
            </div>
        </div>
    );
}

// Step 4: Review
function ReviewStep({ config }: { 
    config: Partial<InterviewConfig>; 
}) {
    const exp = config.experience_level ?? 3;
    const role = config.interviewer_role;
    const personality = config.interviewer_personality;
    const mode = config.interview_mode;
    const company = config.company_type;
    const lang = config.interview_language;

    return (
        <div className="space-y-5 sm:space-y-6 lg:space-y-8">
            <div className="space-y-1.5 sm:space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{String(setup_review_title())}</h2>
                <p className="text-sm sm:text-base text-slate-500">{String(setup_review_subtitle())}</p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 border border-indigo-100">
                <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base">{role ? interviewerRoleLabel(role) : "—"}</h3>
                        <p className="text-xs sm:text-sm text-slate-500">{personality ? interviewerPersonalityLabel(personality) : "—"}</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <ReviewItem label={String(setup_review_candidate())} value={config.candidate_role || "—"} />
                    <ReviewItem label={String(setup_review_experience())} value={`${experienceRangeLabel(exp)} ${String(setup_years_suffix())}`} />
                    <ReviewItem label={String(setup_review_difficulty())} value={String(setup_review_level({ level: config.difficulty_level ?? 3 }))} />
                    <ReviewItem label={String(setup_review_mode())} value={mode ? interviewModeLabel(mode) : "—"} />
                    <ReviewItem label={String(setup_review_company())} value={company ? companyTypeLabel(company) : "—"} />
                    <ReviewItem label={String(setup_review_language())} value={lang ? interviewLanguageLabel(lang) : "—"} />
                </div>

                {config.job_description && (
                    <div className="mt-4 pt-4 border-t border-indigo-200">
                        <p className="text-xs text-slate-500 mb-1">{String(setup_review_job_desc())}</p>
                        <p className="text-xs sm:text-sm text-slate-700 line-clamp-2">{config.job_description}</p>
                    </div>
                )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                    <p className="text-sm font-medium text-amber-800">{String(setup_before_start_title())}</p>
                    <p className="text-xs sm:text-sm text-amber-700 mt-0.5">
                        {String(setup_before_start_body())}
                    </p>
                </div>
            </div>
        </div>
    );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{value}</p>
        </div>
    );
}
