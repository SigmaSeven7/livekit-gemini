import { createFileRoute } from "@tanstack/react-router";
import prisma from "@/lib/prisma";
import { InterviewStatus } from "@/types/conversation";
import { validate as uuidValidate } from "uuid";
import { refreshInterviewAudioUrlFromAgent } from "@/lib/server/interview-audio-url";

export const Route = createFileRoute("/api/history")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const { searchParams } = new URL(request.url);
          const id = searchParams.get("id");

          if (!id) {
            return Response.json(
              { error: "Interview ID is required" },
              { status: 400 },
            );
          }

          if (!uuidValidate(id)) {
            return Response.json(
              { error: "Invalid interview ID format" },
              { status: 400 },
            );
          }

          const interview = await prisma.interview.findUnique({
            where: { id },
          });

          if (!interview) {
            return Response.json(
              { error: "Interview not found" },
              { status: 404 },
            );
          }

          const audioUrl = await refreshInterviewAudioUrlFromAgent(
            id,
            interview.audioUrl,
          );

          return Response.json({
            id: interview.id,
            createdAt: interview.createdAt.toISOString(),
            updatedAt: interview.updatedAt.toISOString(),
            status: interview.status as InterviewStatus,
            config: interview.config ? JSON.parse(interview.config) : null,
            transcript: JSON.parse(interview.transcript),
            processedTranscript: interview.processedTranscript
              ? JSON.parse(interview.processedTranscript)
              : [],
            audioUrl,
            questions: interview.questions ? JSON.parse(interview.questions) : [],
          });
        } catch (error) {
          console.error("Get interview error:", error);
          return Response.json(
            { error: "Failed to get interview" },
            { status: 500 },
          );
        }
      },
    },
  },
});
