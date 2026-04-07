import { createFileRoute } from "@tanstack/react-router";
import { validate as uuidValidate } from "uuid";

import prisma from "@/lib/prisma";
import { interviewRowToDetailDto } from "@/lib/server/interview-detail-response";
import { refreshInterviewAudioUrlFromAgent } from "@/lib/server/interview-audio-url";
import {
  processTranscriptsWithGroq,
  RawTranscriptSegment,
} from "@/lib/services/transcript-processor";
import {
  parseJsonBody,
  updateInterviewBodySchema,
} from "@/lib/validation/interview";

const AUDIO_SERVER_URL = process.env.AUDIO_SERVER_URL || "http://localhost:3001";

export const Route = createFileRoute("/api/interviews/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { id } = params;

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

          return Response.json(interviewRowToDetailDto(interview, audioUrl));
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

          if (!uuidValidate(id)) {
            return Response.json(
              { error: "Invalid interview ID format" },
              { status: 400 },
            );
          }

          const parsed = await parseJsonBody(request, updateInterviewBodySchema);
          if (!parsed.ok) return parsed.response;
          const body = parsed.data;

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

              const messages = body.messages ?? [];

              const interview = await prisma.interview.update({
                where: { id },
                data: {
                  status: "completed",
                  transcript: JSON.stringify(messages),
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

              return Response.json(
                interviewRowToDetailDto(interview, interview.audioUrl),
              );
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

          return Response.json(
            interviewRowToDetailDto(interview, interview.audioUrl),
          );
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

          if (!uuidValidate(id)) {
            return Response.json(
              { error: "Invalid interview ID format" },
              { status: 400 },
            );
          }

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
