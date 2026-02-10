import { InterviewConfig } from "@/data/interview-options";
import {
    INTERVIEWER_ROLES,
    INTERVIEWER_PERSONALITIES,
    INTERVIEW_MODES,
    COMPANY_TYPES,
    EXPERIENCE_LEVELS
} from "@/data/interview-options";
import { QuestionBankResponse } from "@/types/question-bank";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_LARGE_JOBS_MODEL || "openai/gpt-oss-120b"; // Fallback if not set

if (!GROQ_API_KEY) {
    console.warn("GROQ_API_KEY is not set in environment variables");
}

/**
 * Helper to get role description for the prompt
 */
function getRoleDescription(roleId: string): string {
    switch (roleId) {
        case "HR": return "Focus on behavioral questions, culture fit, soft skills, and the STAR method.";
        case "Tech Lead": return "Focus on technical depth, system architecture, trade-offs, and engineering best practices.";
        case "Team Lead": return "Focus on team dynamics, conflict resolution, mentorship, and technical leadership.";
        case "CEO": return "Focus on company vision, ownership, business impact, and long-term potential.";
        case "Peer": return "Focus on collaboration, code review quality, day-to-day work style, and team fit.";
        default: return "General interviewer focusing on role suitability.";
    }
}

/**
 * Helper to get personality tone for the prompt
 */
function getPersonalityTone(personalityId: string): string {
    switch (personalityId) {
        case "Skeptical": return "Challenge assumptions, ask 'why' frequently, dig deep into edge cases, be harder to impress.";
        case "Warm & Welcoming": return "Encouraging, open-ended, allow the candidate to shine, supportive tone.";
        case "Cold & Formal": return "Professional, detached, strict, focuses purely on facts and answers.";
        case "High-Energy": return "Enthusiastic, fast-paced, maybe interruptions, excited about the role.";
        default: return "Professional and neutral.";
    }
}

/**
 * Helper to get interview mode instruction
 */
function getModeInstruction(modeId: string): string {
    switch (modeId) {
        case "Stress Test": return "Ask tough questions, simulate pressure, challenge answers immediately, test resilience.";
        case "Coaching": return "Constructive tone, focus on identifying growth areas, hints can be more educational/guiding.";
        case "Devil's Advocate": return "Consistently take the opposing view to test argumentation skills.";
        default: return "Standard interview flow.";
    }
}

/**
 * Generates interview questions using the Groq API
 */
export async function generateQuestions(config: InterviewConfig): Promise<QuestionBankResponse> {
    if (!GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is not configured");
    }

    const experienceText = EXPERIENCE_LEVELS[config.experience_level - 1]
        ? `${EXPERIENCE_LEVELS[config.experience_level - 1]} years`
        : "Unknown experience";

    const systemPrompt = "You are an expert technical interviewer API. You generate JSON-only responses containing interview questions based on deep context.";

    const userPrompt = `
Generate a question bank of 10 interview questions.

**Target Context:**
- **Candidate Role:** ${config.candidate_role}
- **Experience Level:** ${experienceText}
- **Job Description Summary:** ${config.job_description || 'General role in tech'}
- **Company Culture:** ${config.company_type} (Shape questions to fit this environment)

**Interviewer Persona:**
- **Role:** ${config.interviewer_role} (${getRoleDescription(config.interviewer_role)})
- **Personality:** ${config.interviewer_personality} (Tone: ${getPersonalityTone(config.interviewer_personality)})
- **Mode:** ${config.interview_mode} (${getModeInstruction(config.interview_mode)})
- **Hidden Agenda:** ${config.unspoken_requirements || 'None'} (Subtly test for this if provided)

**Output Requirements:**
1. **Language:** Generate ALL content (questions, hints) in **${config.interview_language}**.
2. **Complexity:** Difficulty level ${config.difficulty_level}/5.
3. **Diversity:** Cover different categories suitable for the role (Technical, Behavioral, etc.).
4. **Hints:** Provide 3 progressive hints for each question (1=Subtle, 2=Moderate, 3=Direct).

**JSON Schema:**
{
  "questions": [
    {
      "question": "The question text in ${config.interview_language}",
      "category": "Category",
      "hints": [
        "Hint 1 (Subtle) in ${config.interview_language}",
        "Hint 2 (Moderate) in ${config.interview_language}",
        "Hint 3 (Direct) in ${config.interview_language}"
      ]
    }
  ]
}

Return ONLY the JSON object.
`;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                response_format: { type: "json_object" },
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Groq API error:", errorText);
            throw new Error(`Groq API failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) {
            throw new Error("No content received from Groq API");
        }

        const parsed = JSON.parse(content);

        // Basic validation
        if (!parsed.questions || !Array.isArray(parsed.questions)) {
            throw new Error("Invalid JSON format: missing 'questions' array");
        }

        return parsed as QuestionBankResponse;

    } catch (error) {
        console.error("Question generation failed:", error);
        throw error;
    }
}
