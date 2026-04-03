import { createFileRoute } from "@tanstack/react-router";
import { generateQuestions } from "@/lib/services/question-generation";
import { InterviewConfig } from "@/data/interview-options";

export const Route = createFileRoute("/api/questions/generate")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const config = body.config as InterviewConfig;

          if (!config) {
            return Response.json(
              { error: "Missing interview configuration" },
              { status: 400 },
            );
          }

          const result = await generateQuestions(config);

          return Response.json(result);
        } catch (error) {
          console.error("Error generating questions:", error);
          return Response.json(
            { error: "Failed to generate questions" },
            { status: 500 },
          );
        }
      },
    },
  },
});
