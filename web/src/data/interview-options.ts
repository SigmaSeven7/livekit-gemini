export const INTERVIEWER_ROLES = [
    { id: "HR", label: "Human Resources (HR)" },
    { id: "Tech Lead", label: "Tech Lead" },
    { id: "Team Lead", label: "Team Lead" },
    { id: "CEO", label: "CEO" },
    { id: "Peer", label: "Peer / Colleague" },
] as const;

export const INTERVIEWER_PERSONALITIES = [
    { id: "Warm & Welcoming", label: "Warm & Welcoming" },
    { id: "Cold & Formal", label: "Cold & Formal" },
    { id: "High-Energy", label: "High-Energy" },
    { id: "Skeptical", label: "Skeptical" },
] as const;

export const INTERVIEW_MODES = [
    { id: "Standard", label: "Standard Interview" },
    { id: "Coaching", label: "Coaching Mode (Feedback)" },
    { id: "Devil's Advocate", label: "Devil's Advocate" },
    { id: "Stress Test", label: "Stress Test" },
] as const;

export const INTERVIEW_PACES = [
    { id: "Slow & Detailed", label: "Slow & Detailed" },
    { id: "Dynamic", label: "Dynamic (Natural)" },
    { id: "Fast & Concise", label: "Fast & Concise" },
] as const;

export const COMPANY_TYPES = [
    { id: "Fast-paced Startup", label: "Fast-paced Startup" },
    { id: "Corporate/Enterprise", label: "Corporate / Enterprise" },
    { id: "Boutique Agency", label: "Boutique Agency" },
] as const;

export const INTERVIEW_LANGUAGES = [
    { id: "English", label: "English" },
    { id: "Hebrew", label: "Hebrew" },
    { id: "Russian", label: "Russian" },
    { id: "Arabic", label: "Arabic" },
] as const;

export const GENDER_PROMPTS = [
    { id: "Male Interviewer to Male Candidate", label: "Male Interviewer → Male Candidate" },
    { id: "Male Interviewer to Female Candidate", label: "Male Interviewer → Female Candidate" },
    { id: "Female Interviewer to Male Candidate", label: "Female Interviewer → Male Candidate" },
    { id: "Female Interviewer to Female Candidate", label: "Female Interviewer → Female Candidate" },
] as const;

export const EXPERIENCE_LEVELS = [
    "0-1", "1-3", "3-5", "5-10", "10+"
] as const;

export type InterviewerRole = typeof INTERVIEWER_ROLES[number]["id"];
export type InterviewerPersonality = typeof INTERVIEWER_PERSONALITIES[number]["id"];
export type InterviewMode = typeof INTERVIEW_MODES[number]["id"];
export type InterviewPace = typeof INTERVIEW_PACES[number]["id"];
export type CompanyType = typeof COMPANY_TYPES[number]["id"];
export type InterviewLanguage = typeof INTERVIEW_LANGUAGES[number]["id"];
export type GenderPrompt = typeof GENDER_PROMPTS[number]["id"];

export interface InterviewConfig {
    interviewer_role: InterviewerRole;
    interviewer_personality: InterviewerPersonality;
    candidate_role: string;
    experience_level: number;
    job_description: string;
    interview_mode: InterviewMode;
    interview_pace: InterviewPace;
    difficulty_level: number; // 1-5
    company_type: CompanyType;
    interview_language: InterviewLanguage;
    gender_prompt?: GenderPrompt;
    unspoken_requirements: string;
}
