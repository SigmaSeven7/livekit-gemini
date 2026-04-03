import type { InterviewLanguage } from "@/data/interview-options";

export type SpeechCoachingUiStrings = {
    panelTitle: string;
    toastTitle: string;
    now: string;
    confidence: string;
    clarity: string;
    pacing: string;
    emotions: string;
    summary: string;
    tone: string;
    vocabulary: string;
    suggestions: string;
    modelLabel: string;
    emptyClient: string;
    emptyAgent: string;
};

const ENGLISH: SpeechCoachingUiStrings = {
    panelTitle: "Live feedback",
    toastTitle: "Live feedback",
    now: "Now",
    confidence: "Confidence",
    clarity: "Clarity",
    pacing: "Pacing",
    emotions: "Emotions",
    summary: "Summary",
    tone: "Tone",
    vocabulary: "Vocabulary",
    suggestions: "Suggestions",
    modelLabel: "Model",
    emptyClient:
        "Coaching runs after at least ~20 seconds of speech, once you pause (~1.5s) at the end of a thought—up to 2 minutes per clip. A cooldown applies between analyses. Keep the tab visible for best results.",
    emptyAgent: "When speech coaching is enabled on the agent, concise tips based on your audio appear here.",
};

const HEBREW: SpeechCoachingUiStrings = {
    panelTitle: "משוב חי",
    toastTitle: "משוב חי",
    now: "עכשיו",
    confidence: "ביטחון",
    clarity: "בהירות",
    pacing: "קצב",
    emotions: "רגשות",
    summary: "סיכום",
    tone: "טון",
    vocabulary: "אוצר מילים",
    suggestions: "הצעות",
    modelLabel: "מודל",
    emptyClient:
        "הניתוח רץ לאחר לפחות ~20 שניות דיבור, לאחר הפסקה (~1.5 שניות) בסוף מחשבה—עד 2 דקות לקטע. יש המתנה בין ניתוחים. השאר את הלשונית גלויה לתוצאות מיטביות.",
    emptyAgent: "כשאימון דיבור מופעל בסוכן, טיפים קצרים יופיעו כאן.",
};

const RUSSIAN: SpeechCoachingUiStrings = {
    panelTitle: "Живая обратная связь",
    toastTitle: "Живая обратная связь",
    now: "Сейчас",
    confidence: "Уверенность",
    clarity: "Ясность",
    pacing: "Темп",
    emotions: "Эмоции",
    summary: "Кратко",
    tone: "Тон",
    vocabulary: "Лексика",
    suggestions: "Советы",
    modelLabel: "Модель",
    emptyClient:
        "Анализ запускается после ~20 с речи и паузы (~1,5 с) в конце мысли — до 2 минут на фрагмент. Между анализами действует пауза. Держите вкладку открытой.",
    emptyAgent: "Если подсказки включены на агенте, они появятся здесь.",
};

const ARABIC: SpeechCoachingUiStrings = {
    panelTitle: "ملاحظات مباشرة",
    toastTitle: "ملاحظات مباشرة",
    now: "الآن",
    confidence: "الثقة",
    clarity: "الوضوح",
    pacing: "الإيقاع",
    emotions: "المشاعر",
    summary: "ملخص",
    tone: "النبرة",
    vocabulary: "المفردات",
    suggestions: "اقتراحات",
    modelLabel: "النموذج",
    emptyClient:
        "يُشغَّل التحليل بعد حوالي 20 ثانية من الكلام، مع توقف (~1.5 ث) في نهاية الفكرة—حتى دقيقتين لكل مقطع. يوجد انتظار بين التحليلات. أبقِ التبويب ظاهرًا.",
    emptyAgent: "عند تفعيل التدريب على الوكيل، تظهر نصائح مختصرة هنا.",
};

const BY_LANG: Record<InterviewLanguage, SpeechCoachingUiStrings> = {
    English: ENGLISH,
    Hebrew: HEBREW,
    Russian: RUSSIAN,
    Arabic: ARABIC,
};

export function getSpeechCoachingUiStrings(lang: string | undefined | null): SpeechCoachingUiStrings {
    if (lang && lang in BY_LANG) {
        return BY_LANG[lang as InterviewLanguage];
    }
    return ENGLISH;
}

export function isSpeechCoachingRtl(lang: string | undefined | null): boolean {
    return lang === "Hebrew" || lang === "Arabic";
}
