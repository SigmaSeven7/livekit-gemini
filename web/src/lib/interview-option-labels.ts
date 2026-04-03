import type {
  CompanyType,
  GenderPrompt,
  InterviewerPersonality,
  InterviewerRole,
  InterviewLanguage,
  InterviewMode,
} from "@/data/interview-options";
import {
  opt_company_agency,
  opt_company_corporate,
  opt_company_startup,
  opt_gender_ff,
  opt_gender_fm,
  opt_gender_mf,
  opt_gender_mm,
  opt_lang_ar,
  opt_lang_en,
  opt_lang_he,
  opt_lang_ru,
  opt_mode_coaching,
  opt_mode_devil,
  opt_mode_standard,
  opt_mode_stress,
  opt_personality_cold,
  opt_personality_high,
  opt_personality_skeptical,
  opt_personality_warm,
  opt_role_ceo,
  opt_role_hr,
  opt_role_peer,
  opt_role_team_lead,
  opt_role_tech_lead,
} from "@/paraglide/messages";

function s(fn: () => unknown): string {
  return String(fn());
}

export function interviewerRoleLabel(role: InterviewerRole): string {
  const map: Record<InterviewerRole, () => unknown> = {
    HR: () => opt_role_hr(),
    "Tech Lead": () => opt_role_tech_lead(),
    "Team Lead": () => opt_role_team_lead(),
    CEO: () => opt_role_ceo(),
    Peer: () => opt_role_peer(),
  };
  return s(map[role]);
}

export function interviewerPersonalityLabel(
  id: InterviewerPersonality,
): string {
  const map: Record<InterviewerPersonality, () => unknown> = {
    "Warm & Welcoming": () => opt_personality_warm(),
    "Cold & Formal": () => opt_personality_cold(),
    "High-Energy": () => opt_personality_high(),
    Skeptical: () => opt_personality_skeptical(),
  };
  return s(map[id]);
}

export function interviewModeLabel(mode: InterviewMode): string {
  const map: Record<InterviewMode, () => unknown> = {
    Standard: () => opt_mode_standard(),
    Coaching: () => opt_mode_coaching(),
    "Devil's Advocate": () => opt_mode_devil(),
    "Stress Test": () => opt_mode_stress(),
  };
  return s(map[mode]);
}

export function companyTypeLabel(type: CompanyType): string {
  const map: Record<CompanyType, () => unknown> = {
    "Fast-paced Startup": () => opt_company_startup(),
    "Corporate/Enterprise": () => opt_company_corporate(),
    "Boutique Agency": () => opt_company_agency(),
  };
  return s(map[type]);
}

export function interviewLanguageLabel(lang: InterviewLanguage): string {
  const map: Record<InterviewLanguage, () => unknown> = {
    English: () => opt_lang_en(),
    Hebrew: () => opt_lang_he(),
    Russian: () => opt_lang_ru(),
    Arabic: () => opt_lang_ar(),
  };
  return s(map[lang]);
}

export function genderPromptLabel(prompt: GenderPrompt): string {
  const map: Record<GenderPrompt, () => unknown> = {
    "Male Interviewer to Male Candidate": () => opt_gender_mm(),
    "Male Interviewer to Female Candidate": () => opt_gender_mf(),
    "Female Interviewer to Male Candidate": () => opt_gender_fm(),
    "Female Interviewer to Female Candidate": () => opt_gender_ff(),
  };
  return s(map[prompt]);
}
