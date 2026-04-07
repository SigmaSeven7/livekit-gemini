import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Bot,
  Building2,
  EyeOff,
  FileText,
  Languages,
  Sparkles,
} from "lucide-react";
import {
  COMPANY_TYPES,
  GENDER_PROMPTS,
  INTERVIEW_LANGUAGES,
  INTERVIEW_MODES,
  INTERVIEWER_PERSONALITIES,
  INTERVIEWER_ROLES,
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
  setup_before_start_body,
  setup_before_start_title,
  setup_candidate_title,
  setup_company_type,
  setup_configure_interviewer_subtitle,
  setup_configure_interviewer_title,
  setup_context_subtitle,
  setup_context_title,
  setup_diff_easy,
  setup_diff_expert,
  setup_diff_moderate,
  setup_difficulty,
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
  setup_target_position,
  setup_year_one,
  setup_years_experience,
  setup_years_other,
  setup_years_suffix,
} from "@/paraglide/messages";
import { choiceBtnBase, choiceBtnOff, choiceBtnOn } from "./setup-styles";
import {
  difficultyLevelLabel,
  experienceRangeLabel,
} from "./setup-step-labels";

export function InterviewerStep({
  config,
  onChange,
}: {
  config: Partial<InterviewConfig>;
  onChange: (field: keyof InterviewConfig, value: unknown) => void;
}) {
  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8">
      <div className="space-y-1.5 sm:space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
          {String(setup_configure_interviewer_title())}
        </h2>
        <p className="text-sm sm:text-base text-slate-500">
          {String(setup_configure_interviewer_subtitle())}
        </p>
      </div>

      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
        <label className="text-sm font-semibold text-slate-700 mb-3 sm:mb-4 block">
          {String(setup_interviewer_role())}
        </label>
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

      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
        <label className="text-sm font-semibold text-slate-700 mb-3 sm:mb-4 block">
          {String(setup_interviewer_personality())}
        </label>
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

      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
        <label className="text-sm font-semibold text-slate-700 mb-3 sm:mb-4 block">
          {String(setup_gender_presentation())}
        </label>
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

export function CandidateStep({
  config,
  onChange,
}: {
  config: Partial<InterviewConfig>;
  onChange: (field: keyof InterviewConfig, value: unknown) => void;
}) {
  const exp = config.experience_level ?? 3;
  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8">
      <div className="space-y-1.5 sm:space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
          {String(setup_candidate_title())}
        </h2>
      </div>

      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
        <label className="text-sm font-semibold text-slate-700 mb-3 sm:mb-4 block">
          {String(setup_target_position())}
        </label>
        <input
          type="text"
          value={config.candidate_role}
          onChange={(e) => onChange("candidate_role", e.target.value)}
          className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border-2 border-slate-200 bg-slate-50 focus:border-indigo-600 focus:bg-white outline-none transition-all font-medium text-sm sm:text-base"
          placeholder={String(setup_placeholder_role())}
        />
      </div>

      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <label className="text-sm font-semibold text-slate-700">
            {String(setup_years_experience())}
          </label>
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
          onChange={(e) => onChange("experience_level", parseInt(e.target.value, 10))}
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

      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <label className="text-sm font-semibold text-slate-700">
            {String(setup_difficulty())}
          </label>
          <span
            className={cn(
              "px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold",
              config.difficulty_level === 1 && "bg-emerald-100 text-emerald-700",
              config.difficulty_level === 2 && "bg-lime-100 text-lime-700",
              config.difficulty_level === 3 && "bg-amber-100 text-amber-700",
              config.difficulty_level === 4 && "bg-orange-100 text-orange-700",
              config.difficulty_level === 5 && "bg-red-100 text-red-700",
            )}
          >
            {difficultyLevelLabel(config.difficulty_level)}
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="5"
          value={config.difficulty_level}
          onChange={(e) => onChange("difficulty_level", parseInt(e.target.value, 10))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
        <div className="flex justify-between mt-2 text-[10px] sm:text-xs text-slate-500">
          <span>{String(setup_diff_easy())}</span>
          <span>{String(setup_diff_moderate())}</span>
          <span>{String(setup_diff_expert())}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
        <label className="text-sm font-semibold text-slate-700 mb-3 sm:mb-4 block">
          {String(setup_interview_mode())}
        </label>
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

export function ContextStep({
  config,
  onChange,
}: {
  config: Partial<InterviewConfig>;
  onChange: (field: keyof InterviewConfig, value: unknown) => void;
}) {
  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8">
      <div className="space-y-1.5 sm:space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
          {String(setup_context_title())}
        </h2>
        <p className="text-sm sm:text-base text-slate-500">
          {String(setup_context_subtitle())}
        </p>
      </div>

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

      <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg shadow-slate-200/50 border border-slate-100">
        <label className="text-sm font-semibold text-slate-700 mb-3 sm:mb-4 block flex items-center gap-2">
          <EyeOff className="w-4 h-4 text-slate-400" />
          {String(setup_hidden_criteria())}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors"
              >
                <span className="text-xs font-bold">?</span>
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">{String(setup_hidden_tooltip())}</p>
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

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{value}</p>
    </div>
  );
}

export function ReviewStep({ config }: { config: Partial<InterviewConfig> }) {
  const exp = config.experience_level ?? 3;
  const role = config.interviewer_role;
  const personality = config.interviewer_personality;
  const mode = config.interview_mode;
  const company = config.company_type;
  const lang = config.interview_language;

  return (
    <div className="space-y-5 sm:space-y-6 lg:space-y-8">
      <div className="space-y-1.5 sm:space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
          {String(setup_review_title())}
        </h2>
        <p className="text-sm sm:text-base text-slate-500">
          {String(setup_review_subtitle())}
        </p>
      </div>

      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 border border-indigo-100">
        <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
              {role ? interviewerRoleLabel(role) : "—"}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500">
              {personality ? interviewerPersonalityLabel(personality) : "—"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <ReviewItem
            label={String(setup_review_candidate())}
            value={config.candidate_role || "—"}
          />
          <ReviewItem
            label={String(setup_review_experience())}
            value={`${experienceRangeLabel(exp)} ${String(setup_years_suffix())}`}
          />
          <ReviewItem
            label={String(setup_review_difficulty())}
            value={String(setup_review_level({ level: config.difficulty_level ?? 3 }))}
          />
          <ReviewItem
            label={String(setup_review_mode())}
            value={mode ? interviewModeLabel(mode) : "—"}
          />
          <ReviewItem
            label={String(setup_review_company())}
            value={company ? companyTypeLabel(company) : "—"}
          />
          <ReviewItem
            label={String(setup_review_language())}
            value={lang ? interviewLanguageLabel(lang) : "—"}
          />
        </div>

        {config.job_description && (
          <div className="mt-4 pt-4 border-t border-indigo-200">
            <p className="text-xs text-slate-500 mb-1">{String(setup_review_job_desc())}</p>
            <p className="text-xs sm:text-sm text-slate-700 line-clamp-2">
              {config.job_description}
            </p>
          </div>
        )}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-medium text-amber-800">
            {String(setup_before_start_title())}
          </p>
          <p className="text-xs sm:text-sm text-amber-700 mt-0.5">
            {String(setup_before_start_body())}
          </p>
        </div>
      </div>
    </div>
  );
}
