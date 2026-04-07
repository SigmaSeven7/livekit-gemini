import { createFileRoute } from "@tanstack/react-router";
import { PlaygroundState } from "@/data/playground-state";
import { createLiveKitRoomJwt } from "@/lib/server/livekit-room-token";

export const Route = createFileRoute("/api/token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          let playgroundState: PlaygroundState;

          try {
            playgroundState = await request.json();
          } catch {
            return Response.json(
              { error: "Invalid JSON in request body" },
              { status: 400 },
            );
          }

          const {
            instructions,
            geminiAPIKey,
            sessionConfig: {
              model,
              modalities,
              voice,
              temperature,
              maxOutputTokens,
              nanoBananaEnabled,
            },
          } = playgroundState;

          if (!geminiAPIKey) {
            return Response.json(
              { error: "Gemini API key is required" },
              { status: 400 },
            );
          }

          const roomName = Math.random().toString(36).slice(7);

          const metadata = {
            instructions: instructions,
            model: model,
            modalities: modalities,
            voice: voice,
            temperature: temperature,
            max_output_tokens: maxOutputTokens,
            nano_banana_enabled: nanoBananaEnabled,
            gemini_api_key: geminiAPIKey,
          };

          const { accessToken } = await createLiveKitRoomJwt({
            roomName,
            identity: "human",
            metadata: JSON.stringify(metadata),
            canUpdateOwnMetadata: true,
          });
          return Response.json({
            accessToken,
            url: process.env.LIVEKIT_URL,
          });
        } catch (error) {
          return Response.json(
            {
              error: "Error generating token",
              details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 },
          );
        }
      },
    },
  },
});
