import { createFileRoute } from "@tanstack/react-router";
import { getDefaultStorage, getAudioStoragePath } from "@/lib/storage";
import { BatchUploadRequest, BatchUploadResponse } from "@/types/conversation";
import { base64ToBuffer } from "@/lib/audio/wav-encoder";

export const Route = createFileRoute("/api/audio/batch-upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: BatchUploadRequest = await request.json();
          const { interviewId, segments } = body;

          if (!interviewId) {
            return Response.json(
              { error: "interviewId is required" },
              { status: 400 },
            );
          }

          if (!segments || !Array.isArray(segments) || segments.length === 0) {
            return Response.json(
              { error: "segments array is required and must not be empty" },
              { status: 400 },
            );
          }

          const storage = getDefaultStorage();
          const urls: Record<string, string> = {};

          for (const segment of segments) {
            const { transcriptId, audioBase64 } = segment;

            if (!transcriptId || !audioBase64) {
              console.warn(
                `Skipping segment with missing data: transcriptId=${transcriptId}`,
              );
              continue;
            }

            try {
              const audioBuffer = base64ToBuffer(audioBase64);

              const storagePath = getAudioStoragePath(interviewId, transcriptId);

              const url = await storage.upload(storagePath, audioBuffer, "audio/wav");

              urls[transcriptId] = url;
            } catch (error) {
              console.error(`Failed to upload segment ${transcriptId}:`, error);
            }
          }

          const response: BatchUploadResponse = { urls };
          return Response.json(response);
        } catch (error) {
          console.error("Batch upload error:", error);
          return Response.json(
            { error: "Failed to process batch upload" },
            { status: 500 },
          );
        }
      },
    },
  },
});
