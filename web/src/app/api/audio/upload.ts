import { createFileRoute } from "@tanstack/react-router";
import {
  getDefaultStorage,
  getAudioStoragePath,
  MAX_AUDIO_SIZE_BYTES,
} from "@/lib/storage";
import { base64ToBuffer } from "@/lib/audio/wav-encoder";

interface SingleUploadRequest {
  interviewId: string;
  transcriptId: string;
  audioBase64: string;
}

interface SingleUploadResponse {
  success: boolean;
  url?: string;
  error?: string;
}

export const Route = createFileRoute("/api/audio/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: SingleUploadRequest = await request.json();
          const { interviewId, transcriptId, audioBase64 } = body;

          if (!interviewId) {
            return Response.json(
              { success: false, error: "interviewId is required" } as SingleUploadResponse,
              { status: 400 },
            );
          }

          if (!transcriptId) {
            return Response.json(
              { success: false, error: "transcriptId is required" } as SingleUploadResponse,
              { status: 400 },
            );
          }

          if (!audioBase64) {
            return Response.json(
              { success: false, error: "audioBase64 is required" } as SingleUploadResponse,
              { status: 400 },
            );
          }

          const estimatedSizeBytes = Math.ceil(audioBase64.length * 0.75);

          if (estimatedSizeBytes > MAX_AUDIO_SIZE_BYTES) {
            return Response.json(
              {
                success: false,
                error: "Audio file too large (max 10MB)",
              } as SingleUploadResponse,
              { status: 413 },
            );
          }

          const storage = getDefaultStorage();

          const audioBuffer = base64ToBuffer(audioBase64);

          const storagePath = getAudioStoragePath(interviewId, transcriptId);

          const url = await storage.upload(storagePath, audioBuffer, "audio/wav");

          const response: SingleUploadResponse = {
            success: true,
            url,
          };
          return Response.json(response);
        } catch (error) {
          console.error("Single audio upload error:", error);
          return Response.json(
            { success: false, error: "Failed to upload audio" } as SingleUploadResponse,
            { status: 500 },
          );
        }
      },
    },
  },
});
