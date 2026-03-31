"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
    User,
    Settings2,
    Languages,
    Building2,
    EyeOff,
    Users,
    Briefcase,
    FileText,
    Play,
    Bot,
    Mic,
    Calendar,
    LucideIcon,
} from "lucide-react";
import {
    INTERVIEWER_PERSONALITIES,
    INTERVIEW_MODES,
    INTERVIEW_LANGUAGES,
    GENDER_PROMPTS,
    COMPANY_TYPES,
    InterviewConfig
} from "@/data/interview-options";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@example.com';

const STEPS: { id: number; title: string; description: string; icon: LucideIcon }[] = [
    { id: 1, title: "Interviewer", description: "Configure your AI interviewer", icon: Bot },
    { id: 2, title: "Candidate", description: "Role & experience", icon: Users },
    { id: 3, title: "Context", description: "Job details & criteria", icon: FileText },
    { id: 4, title: "Review", description: "Confirm & start", icon: Play },
];

export function SetupForm() {
    const router = useRouter();
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
            const targetPath = `/interview/${interviewId}`;

            if (process.env.NODE_ENV === 'development') {
                // Warm route chunks + RSC payload before navigating so the interview page
                // can hydrate on first paint (dev compiles on demand; cold full loads often stall).
                router.prefetch(targetPath);
                await new Promise((resolve) => setTimeout(resolve, 200));
            }

            router.push(targetPath);

            if (process.env.NODE_ENV === 'development') {
                // HMR can cancel client-side navigation; hard-nav if we're still on setup.
                window.setTimeout(() => {
                    if (!window.location.pathname.startsWith('/interview/')) {
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
        if (currentStep < STEPS.length) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const experienceValueMap: Record<number, string> = { 1: "0-1", 2: "1-3", 3: "3-5", 4: "5-10", 5: "10+" };
    const progress = (currentStep / STEPS.length) * 100;

    if (!mounted) {
        return null;
    }

    return (
        <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-white to-slate-100">
            {/* Top Progress Bar */}
            <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-lg border-b border-slate-200/50">
                <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-2 sm:py-4">
                    {/* Logo & Title Row - Hidden on mobile, visible on sm+ */}
                    <div className="hidden sm:flex items-center justify-between mb-2 mt-4 sm:mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <Mic className="w-4 h-4 text-white" />
                            </div>
                            <span className="font-bold text-slate-800">InterviewAI</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Calendar className="w-4 h-4" />
                            <span>Practice Session</span>
                        </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <Progress value={progress} className="h-1.5 bg-slate-100" />
                    
                    {/* Step Indicators */}
                    <div className="flex items-center w-full mt-2">
                        {STEPS.map((step, index) => {
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
                                        index !== STEPS.length - 1 && "border-r border-slate-200"
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
            <div className="pt-20 sm:pt-8 lg:pt-8 pb-32 sm:pb-40 md:pb-44 px-3 sm:px-4 md:px-6">
                <div className="max-w-5xl mx-auto">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
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
                                    <ReviewStep config={config} onGoBack={goToStep} />
                                )}
                            </div>
                        </div>

                        {/* Summary Sidebar - Desktop Only */}
                        <div className="hidden lg:block">
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
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                    <div className="flex items-center justify-between gap-3">
                        <Button
                            variant="ghost"
                            onClick={prevStep}
                            disabled={currentStep === 1}
                            className="text-slate-600 hover:text-slate-900 px-2 sm:px-4"
                        >
                            <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" />
                            <span className="hidden sm:inline">Back</span>
                        </Button>
                        
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
                            <span className="font-medium">{currentStep}</span>
                            <span>/</span>
                            <span>{STEPS.length}</span>
                        </div>

                        {currentStep < STEPS.length ? (
                            <Button
                                onClick={nextStep}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 sm:px-6 rounded-full font-medium text-sm"
                            >
                                Continue
                                <ArrowRight className="w-4 h-4 ml-1.5 sm:ml-2" />
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
                                        Starting...
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-4 h-4 mr-1.5 sm:mr-2" />
                                        Start Interview
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
                title="Failed to Start Interview"
                description={`We couldn't create your interview session. Please try again later or contact support at ${SUPPORT_EMAIL} if the problem persists.`}
            />
        </div>
    );
}

function SummaryItem({ label, value, icon: Icon, color, bgColor }: { 
    label: string; 
    value: string | undefined; 
    icon: LucideIcon;
    color: string;
    bgColor: string;
}) {
    return (
        <div className="flex items-center gap-3">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", bgColor)}>
                <Icon className={cn("w-4 h-4", color)} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="text-sm font-semibold text-slate-800 truncate">{value || "—"}</p>
            </div>
        </div>
    );
}

// Step 1: Interviewer Configuration
function InterviewerStep({ config, onChange }: { 
    config: Partial<InterviewConfig>; 
    onChange: (field: keyof InterviewConfig, value: any) => void;
}) {
    return (
        <div className="space-y-5 sm:space-y-6 lg:space-y-8">
            <div className="space-y-1.5 sm:space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Configure Your Interviewer</h2>
                <p className="text-sm sm:text-base text-slate-500">Choose who will be interviewing you and their style.</p>
            </div>

            {/* Interviewer Role */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                <label className="text-sm font-semibold text-slate-700 mb-3 sm:mb-4 block">Interviewer Role</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                    {["HR", "Tech Lead", "Team Lead", "CEO", "Peer"].map((role) => (
                        <button
                            key={role}
                            onClick={() => onChange("interviewer_role", role)}
                            className={cn(
                                "py-3 sm:py-4 px-2 sm:px-3 rounded-xl border-2 transition-all font-medium text-xs sm:text-sm",
                                config.interviewer_role === role
                                    ? "border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md shadow-indigo-100"
                                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                            )}
                        >
                            {role}
                        </button>
                    ))}
                </div>
            </div>

            {/* Personality */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                <label className="text-sm font-semibold text-slate-700 mb-3 sm:mb-4 block">Interviewer Personality</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {INTERVIEWER_PERSONALITIES.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => onChange("interviewer_personality", p.id)}
                            className={cn(
                                "p-3 sm:p-4 rounded-xl border-2 transition-all text-left",
                                config.interviewer_personality === p.id
                                    ? "border-purple-600 bg-purple-50 text-purple-700 shadow-md shadow-purple-100"
                                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                            )}
                        >
                            <span className="font-medium text-sm">{p.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Gender & Pronouns */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                <label className="text-sm font-semibold text-slate-700 mb-3 sm:mb-4 block">Gender Presentation</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {GENDER_PROMPTS.map((g) => (
                        <button
                            key={g.id}
                            onClick={() => onChange("gender_prompt", g.id)}
                            className={cn(
                                "p-3 sm:p-4 rounded-xl border-2 transition-all text-left flex items-center justify-between",
                                config.gender_prompt === g.id
                                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                            )}
                        >
                            <span className="text-xs sm:text-sm font-medium">{g.label}</span>
                            {config.gender_prompt === g.id && (
                                <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            )}
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
    return (
        <div className="space-y-5 sm:space-y-6 lg:space-y-8">
            <div className="space-y-1.5 sm:space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">About the Candidate</h2>
                <p className="text-sm sm:text-base text-slate-500">Tell us about who you&apos;re pretending to be.</p>
            </div>

            {/* Target Position */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                <label className="text-sm font-semibold text-slate-700 mb-3 sm:mb-4 block">Target Position</label>
                <input
                    type="text"
                    value={config.candidate_role}
                    onChange={(e) => onChange("candidate_role", e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:border-indigo-600 focus:bg-white outline-none transition-all font-medium text-sm sm:text-base"
                    placeholder="e.g., Fullstack Developer"
                />
            </div>

            {/* Experience Level */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <label className="text-sm font-semibold text-slate-700">Years of Experience</label>
                    <span className="px-2.5 sm:px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs sm:text-sm font-semibold">
                        {config.experience_level} {config.experience_level === 1 ? "year" : "years"}
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
                    <span>0-1y</span>
                    <span>1-3y</span>
                    <span>3-5y</span>
                    <span>5-10y</span>
                    <span>10y+</span>
                </div>
            </div>

            {/* Difficulty */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <label className="text-sm font-semibold text-slate-700">Interview Difficulty</label>
                    <span className={cn(
                        "px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold",
                        config.difficulty_level === 1 && "bg-emerald-100 text-emerald-700",
                        config.difficulty_level === 2 && "bg-lime-100 text-lime-700",
                        config.difficulty_level === 3 && "bg-amber-100 text-amber-700",
                        config.difficulty_level === 4 && "bg-orange-100 text-orange-700",
                        config.difficulty_level === 5 && "bg-red-100 text-red-700"
                    )}>
                        {config.difficulty_level === 1 && "Easy"}
                        {config.difficulty_level === 2 && "Beginner"}
                        {config.difficulty_level === 3 && "Moderate"}
                        {config.difficulty_level === 4 && "Challenging"}
                        {config.difficulty_level === 5 && "Expert"}
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
                    <span>Easy</span>
                    <span>Moderate</span>
                    <span>Expert</span>
                </div>
            </div>

            {/* Mode */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                <label className="text-sm font-semibold text-slate-700 mb-3 sm:mb-4 block">Interview Mode</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {INTERVIEW_MODES.map((m) => (
                        <button
                            key={m.id}
                            onClick={() => onChange("interview_mode", m.id)}
                            className={cn(
                                "p-3 sm:p-4 rounded-xl border-2 transition-all text-left",
                                config.interview_mode === m.id
                                    ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                            )}
                        >
                            <span className="font-medium text-sm">{m.label}</span>
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
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Context & Criteria</h2>
                <p className="text-sm sm:text-base text-slate-500">Provide additional context to make the interview more realistic.</p>
            </div>

            {/* Job Description */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                <label className="text-sm font-semibold text-slate-700 mb-3 sm:mb-4 block flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-400" />
                    Job Description (Optional)
                </label>
                <textarea
                    value={config.job_description}
                    onChange={(e) => onChange("job_description", e.target.value)}
                    className="w-full h-24 sm:h-32 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:border-indigo-600 focus:bg-white outline-none transition-all text-sm resize-none"
                    placeholder="Paste the job description here to help the AI ask relevant questions..."
                />
                <p className="text-xs text-slate-400 mt-2">The AI will use this to tailor questions to the specific role.</p>
            </div>

            {/* Company Type */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                <label className="text-sm font-semibold text-slate-700 mb-3 sm:mb-4 block flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-slate-400" />
                    Company Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                    {COMPANY_TYPES.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => onChange("company_type", t.id)}
                            className={cn(
                                "p-3 sm:p-4 rounded-xl border-2 transition-all text-center",
                                config.company_type === t.id
                                    ? "border-cyan-600 bg-cyan-50 text-cyan-700"
                                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                            )}
                        >
                            <span className="font-medium text-xs sm:text-sm">{t.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Language */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                <label className="text-sm font-semibold text-slate-700 mb-3 sm:mb-4 block flex items-center gap-2">
                    <Languages className="w-4 h-4 text-slate-400" />
                    Interview Language
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    {INTERVIEW_LANGUAGES.map((l) => (
                        <button
                            key={l.id}
                            onClick={() => onChange("interview_language", l.id)}
                            className={cn(
                                "p-3 sm:p-4 rounded-xl border-2 transition-all text-center",
                                config.interview_language === l.id
                                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                                    : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                            )}
                        >
                            <span className="font-medium text-xs sm:text-sm">{l.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Hidden Agenda */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
                <label className="text-sm font-semibold text-slate-700 mb-3 sm:mb-4 block flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-slate-400" />
                    Hidden Evaluation Criteria
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button type="button" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors">
                                <span className="text-xs font-bold">?</span>
                            </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                            <p className="text-xs">
                                <strong>Secret criteria</strong> the interviewer will evaluate but won&apos;t explicitly mention.
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </label>
                <input
                    type="text"
                    value={config.unspoken_requirements}
                    onChange={(e) => onChange("unspoken_requirements", e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:border-indigo-600 focus:bg-white outline-none transition-all font-medium text-sm"
                    placeholder="e.g., Check for humility, look for red flags"
                />
            </div>
        </div>
    );
}

// Step 4: Review
function ReviewStep({ config, onGoBack }: { 
    config: Partial<InterviewConfig>; 
    onGoBack: (step: number) => void;
}) {
    const experienceValueMap: Record<number, string> = { 1: "0-1", 2: "1-3", 3: "3-5", 4: "5-10", 5: "10+" };
    
    return (
        <div className="space-y-5 sm:space-y-6 lg:space-y-8">
            <div className="space-y-1.5 sm:space-y-2">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Ready to Start</h2>
                <p className="text-sm sm:text-base text-slate-500">Review your configuration before starting the interview.</p>
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 border border-indigo-100">
                <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base">{config.interviewer_role}</h3>
                        <p className="text-xs sm:text-sm text-slate-500">{config.interviewer_personality}</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <ReviewItem label="Candidate" value={config.candidate_role || "—"} />
                    <ReviewItem label="Experience" value={`${experienceValueMap[config.experience_level || 3]} years`} />
                    <ReviewItem label="Difficulty" value={`Level ${config.difficulty_level}/5`} />
                    <ReviewItem label="Mode" value={config.interview_mode || "—"} />
                    <ReviewItem label="Company" value={config.company_type || "—"} />
                    <ReviewItem label="Language" value={config.interview_language || "—"} />
                </div>

                {config.job_description && (
                    <div className="mt-4 pt-4 border-t border-indigo-200">
                        <p className="text-xs text-slate-500 mb-1">Job Description</p>
                        <p className="text-xs sm:text-sm text-slate-700 line-clamp-2">{config.job_description}</p>
                    </div>
                )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                    <p className="text-sm font-medium text-amber-800">Before you start</p>
                    <p className="text-xs sm:text-sm text-amber-700 mt-0.5">
                        Make sure you&apos;re in a quiet environment with a working microphone. The interview will be voice-based.
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
