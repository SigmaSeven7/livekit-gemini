"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { 
    ArrowRight, 
    Sparkles, 
    User, 
    Settings2, 
    Briefcase, 
    Languages, 
    ShieldCheck, 
    Building2, 
    EyeOff,
    Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
    INTERVIEWER_ROLES, 
    INTERVIEWER_PERSONALITIES, 
    INTERVIEW_MODES, 
    INTERVIEW_LANGUAGES, 
    GENDER_PROMPTS, 
    EXPERIENCE_LEVELS, 
    COMPANY_TYPES,
    InterviewConfig 
} from "@/data/interview-options";

export function SetupForm() {
    const router = useRouter();
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
        unspoken_requirements: ""
    });

    const handleStart = () => {
        const sessionId = uuidv4();
        sessionStorage.setItem(`interview-config-${sessionId}`, JSON.stringify(config));
        router.push(`/interview/${sessionId}`);
    };

    const handleChange = (field: keyof InterviewConfig, value: any) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    // Mapping for experience display
    const experienceValueMap: Record<number, string> = { 1: "0-1", 2: "1-3", 3: "3-5", 4: "5-10", 5: "10+" };

    return (
        <div className="relative min-h-screen bg-slate-50/50 pb-32 sm:pb-40 md:pb-48">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-16 sm:space-y-20">
                
                {/* Header */}
                <header className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-sm text-indigo-600 font-black uppercase tracking-widest">
                        <Sparkles className="w-3 h-3" /> Apply AI Simulation Engine
                    </div>
                    <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight">Configure Your Session</h1>
                </header>

                {/* 01. The Interviewer Persona */}
                <section className="space-y-8">
                    <SectionHeader number="01" title="The Interviewer" icon={<User className="w-4 h-4" />} />
                    
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-tighter ml-1">Interviewer Role</label>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                            {["HR", "Tech Lead", "Team Lead", "CEO", "Peer"].map((role) => (
                                <SelectCard 
                                    key={role}
                                    label={role}
                                    isSelected={config.interviewer_role === role}
                                    onClick={() => handleChange("interviewer_role", role)}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col justify-center items-center bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
                        <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                             Personality & Vibe
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {INTERVIEWER_PERSONALITIES.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => handleChange("interviewer_personality", p.id)}
                                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                                        config.interviewer_personality === p.id 
                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" 
                                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                                    }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-tighter ml-1">Gender & Pronouns</label>
                        <div className="flex flex-wrap gap-2 mt-4">
                            {GENDER_PROMPTS.map(g => (
                                <button
                                    key={g.id}
                                    onClick={() => handleChange("gender_prompt", g.id)}
                                    className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all ${
                                        config.gender_prompt === g.id ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-500"
                                    }`}
                                >
                                    {g.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 02. Simulation Parameters */}
                <section className="space-y-8">
                    <SectionHeader number="02" title="About the candidate" icon={<Settings2 className="w-4 h-4" />} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Difficulty */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-6">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-semibold text-slate-700">Difficulty</label>
                                <span className="text-[12px] font-black text-indigo-600 uppercase bg-indigo-50 px-2 py-1 rounded">{config.difficulty_level}</span>
                            </div>
                            <input 
                                type="range" min="1" max="5" 
                                value={config.difficulty_level}
                                onChange={(e) => handleChange("difficulty_level", parseInt(e.target.value))}
                                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                        </div>
                        {/* Interview Mode */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
                             <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-slate-400" /> Mode
                             </label>
                             <select 
                                className="w-full bg-slate-50 rounded-xl p-3 text-sm font-medium outline-none"
                                value={config.interview_mode}
                                onChange={(e) => handleChange("interview_mode", e.target.value)}
                            >
                                {INTERVIEW_MODES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                            </select>
                        </div>
                        {/* Language */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
                             <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Languages className="w-4 h-4 text-slate-400" /> Language
                             </label>
                             <select 
                                className="w-full bg-slate-50 rounded-xl p-3 text-sm font-medium outline-none"
                                value={config.interview_language}
                                onChange={(e) => handleChange("interview_language", e.target.value)}
                            >
                                {INTERVIEW_LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                            </select>
                        </div>
                        {/* Company Type */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
                             <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-slate-400" /> Company Type
                             </label>
                             <select 
                                className="w-full bg-slate-50 rounded-xl p-3 text-sm font-medium outline-none"
                                value={config.company_type}
                                onChange={(e) => handleChange("company_type", e.target.value)}
                            >
                                {COMPANY_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                            </select>
                        </div>
                    </div>
                </section>

                {/* 03. Context & Intelligence */}
                <section className="space-y-8">
                   
                    
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-tighter ml-1">Job Description</label>
                        <textarea 
                            placeholder="Paste requirements here to sharpen the AI..."
                            className="w-full h-40 bg-white border border-slate-200 rounded-3xl p-6 text-sm focus:ring-4 focus:ring-indigo-500/5 outline-none transition-all"
                            value={config.job_description}
                            onChange={(e) => handleChange("job_description", e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-tighter ml-1">Target Position</label>
                            <input 
                                type="text"
                                className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm outline-none focus:border-indigo-500"
                                value={config.candidate_role}
                                onChange={(e) => handleChange("candidate_role", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-tighter ml-1">Experience (Years)</label>
                            <select 
                                className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm outline-none"
                                value={config.experience_level}
                                onChange={(e) => handleChange("experience_level", parseInt(e.target.value))}
                            >
                                {EXPERIENCE_LEVELS.map((l, idx) => (
                                    <option key={l} value={idx + 1}>{l} Years</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-tighter ml-1 flex items-center gap-2">
                            <EyeOff className="w-3 h-3" /> Hidden Agenda
                        </label>
                        <input 
                            type="text"
                            placeholder="Humility check? Job hopper concerns?"
                            className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm italic"
                            value={config.unspoken_requirements}
                            onChange={(e) => handleChange("unspoken_requirements", e.target.value)}
                        />
                    </div>
                </section>
            </div>

            {/* --- STICKY FOOTER DOCK --- */}
            <div className="fixed bottom-0 left-0 right-0 z-50 px-3 sm:px-4 md:px-6 pb-3 sm:pb-4 md:pb-8">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl md:rounded-[2.5rem] p-3 sm:p-4 flex flex-col md:flex-row items-center gap-3 sm:gap-4 md:gap-6">
                        <div className="flex-1 flex items-center gap-3 sm:gap-4 md:gap-6 overflow-x-auto no-scrollbar px-2 sm:px-4 w-full md:w-auto min-w-0">
                            <SummaryPill label="Interviewer" value={config.interviewer_role} color="text-indigo-400" />
                            <SummaryPill label="Mode" value={config.interview_mode} color="text-emerald-400" />
                            <SummaryPill label="Exp" value={`${experienceValueMap[config.experience_level || 3]}y`} color="text-amber-400" />
                        </div>

                        <Button 
                            onClick={handleStart}
                            className="w-full md:w-auto px-6 sm:px-8 md:px-10 h-12 sm:h-14 rounded-full bg-white hover:bg-slate-100 text-slate-900 font-black text-xs sm:text-sm uppercase tracking-widest gap-2 sm:gap-3 transition-all shrink-0 shadow-xl"
                        >
                            <span className="hidden sm:inline">Start Simulation</span>
                            <span className="sm:hidden">Start</span>
                            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function SectionHeader({ number, title, icon }: { number: string; title: string, icon: React.ReactNode }) {
    return (
        <div className="flex items-center gap-4">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Step {number}</span>
            <div className="h-[1px] flex-1 bg-slate-200" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                {icon} {title}
            </h2>
        </div>
    );
}

function SelectCard({ label, isSelected, onClick }: { label: string; isSelected: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`py-4 px-2 rounded-2xl border-2 transition-all flex flex-col items-center justify-center ${
                isSelected 
                ? "border-indigo-600 bg-white shadow-xl shadow-indigo-100/50 scale-105" 
                : "border-transparent bg-white text-slate-400 hover:text-slate-600"
            }`}
        >
            <span className={`text-xs font-black uppercase tracking-tight ${isSelected ? "text-indigo-600" : ""}`}>
                {label}
            </span>
        </button>
    );
}

function SummaryPill({ label, value, color }: { label: string; value: any; color: string }) {
    return (
        <div className="flex flex-col shrink-0 min-w-0">
            <span className="text-[8px] sm:text-[9px] text-slate-500 font-bold uppercase tracking-widest whitespace-nowrap">{label}</span>
            <span className={`text-[10px] sm:text-xs font-bold ${color} truncate`}>{value || "—"}</span>
        </div>
    );
}