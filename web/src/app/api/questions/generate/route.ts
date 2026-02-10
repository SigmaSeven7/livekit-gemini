import { NextRequest, NextResponse } from "next/server";
import { generateQuestions } from "@/lib/services/question-generation";
import { InterviewConfig } from "@/data/interview-options";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const config = body.config as InterviewConfig;

        if (!config) {
            return NextResponse.json(
                { error: "Missing interview configuration" },
                { status: 400 }
            );
        }

        // Call the service to generate questions
        const result = await generateQuestions(config);

        return NextResponse.json(result);

    } catch (error) {
        console.error("Error generating questions:", error);
        return NextResponse.json(
            { error: "Failed to generate questions" },
            { status: 500 }
        );
    }
}
