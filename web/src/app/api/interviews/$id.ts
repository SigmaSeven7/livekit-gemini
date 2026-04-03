import { createFileRoute } from "@tanstack/react-router";
import prisma from "@/lib/prisma";
import { ConversationMessage, InterviewStatus } from "@/types/conversation";
import {
  processTranscriptsWithGroq,
  RawTranscriptSegment,
} from "@/lib/services/transcript-processor";
import { refreshInterviewAudioUrlFromAgent } from "@/lib/server/interview-audio-url";

interface UpdateInterviewBody {
  status?: InterviewStatus;
  config?: Record<string, unknown>;
  messages?: ConversationMessage[];
}

const AUDIO_SERVER_URL = process.env.AUDIO_SERVER_URL || "http://localhost:3001";

export const Route = createFileRoute("/api/interviews/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { id } = params;

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
            createdAt: interview.createdAt,
            updatedAt: interview.updatedAt,
            status: interview.status,
            config: interview.config ? JSON.parse(interview.config) : null,
            messages: JSON.parse(interview.transcript),
            processedTranscript: interview.processedTranscript
              ? JSON.parse(interview.processedTranscript)
              : [],
            audioUrl,
          });
        } catch (error) {
          console.error("Get interview error:", error);
          return Response.json(
            { error: "Failed to get interview" },
            { status: 500 },
          );
        }
      },
      PUT: async ({ request, params }) => {
        try {
          const { id } = params;
          const body: UpdateInterviewBody = await request.json();

          const existing = await prisma.interview.findUnique({
            where: { id },
          });

          if (!existing) {
            return Response.json(
              { error: "Interview not found" },
              { status: 404 },
            );
          }

          if (body.status === "completed") {
            try {
              const audioServerRes = await fetch(
                `${AUDIO_SERVER_URL}/getAudioFile?id=${encodeURIComponent(id)}`,
              );

              if (!audioServerRes.ok) {
                console.error(
                  "Failed to fetch from audio server:",
                  audioServerRes.statusText,
                );
                return Response.json(
                  { error: "Failed to fetch audio data from agent server" },
                  { status: 502 },
                );
              }

              const audioData = await audioServerRes.json();
              const rawTranscripts = audioData.transcripts || [];
              const audioUrl = audioData.audioUrl || null;

              const processedMessages = await processTranscriptsWithGroq(
                rawTranscripts as RawTranscriptSegment[],
              );

              const interview = await prisma.interview.update({
                where: { id },
                data: {
                  status: "completed",
                  transcript: JSON.stringify(body.messages || []),
                  processedTranscript: JSON.stringify(processedMessages),
                  audioUrl: audioUrl,
                },
              });

              try {
                await fetch(
                  `${AUDIO_SERVER_URL}/interviews/${encodeURIComponent(id)}`,
                  {
                    method: "DELETE",
                  },
                );
              } catch (deleteError) {
                console.warn(
                  "Failed to delete transcripts from agent DB:",
                  deleteError,
                );
              }

              return Response.json({
                id: interview.id,
                createdAt: interview.createdAt,
                updatedAt: interview.updatedAt,
                status: interview.status,
                config: interview.config ? JSON.parse(interview.config) : null,
                transcript: JSON.parse(interview.transcript),
                processedTranscript: interview.processedTranscript
                  ? JSON.parse(interview.processedTranscript)
                  : [],
                audioUrl: interview.audioUrl,
              });
            } catch (processingError) {
              console.error(
                "Error processing interview completion:",
                processingError,
              );
              return Response.json(
                { error: "Failed to process interview data" },
                { status: 500 },
              );
            }
          }

          const updateData: {
            status?: string;
            config?: string | null;
            transcript?: string;
          } = {};

          if (body.status) {
            updateData.status = body.status;
          }

          if (body.config !== undefined) {
            updateData.config = body.config ? JSON.stringify(body.config) : null;
          }

          if (body.messages !== undefined) {
            updateData.transcript = JSON.stringify(body.messages);
          }

          const interview = await prisma.interview.update({
            where: { id },
            data: updateData,
          });

          return Response.json({
            id: interview.id,
            createdAt: interview.createdAt,
            updatedAt: interview.updatedAt,
            status: interview.status,
            config: interview.config ? JSON.parse(interview.config) : null,
            messages: JSON.parse(interview.transcript),
          });
        } catch (error) {
          console.error("Update interview error:", error);
          return Response.json(
            { error: "Failed to update interview" },
            { status: 500 },
          );
        }
      },
      DELETE: async ({ params }) => {
        try {
          const { id } = params;

          const existing = await prisma.interview.findUnique({
            where: { id },
          });

          if (!existing) {
            return Response.json(
              { error: "Interview not found" },
              { status: 404 },
            );
          }

          await prisma.interview.delete({
            where: { id },
          });

          return Response.json({ success: true });
        } catch (error) {
          console.error("Delete interview error:", error);
          return Response.json(
            { error: "Failed to delete interview" },
            { status: 500 },
          );
        }
      },
    },
  },
});
