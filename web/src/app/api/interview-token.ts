import { createFileRoute } from "@tanstack/react-router";

import { createLiveKitRoomJwt } from "@/lib/server/livekit-room-token";

export const Route = createFileRoute("/api/interview-token")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { config, roomName } = body;

          if (!roomName || typeof roomName !== "string") {
            return Response.json(
              { error: "roomName is required" },
              { status: 400 },
            );
          }

          const apiKey = process.env.LIVEKIT_API_KEY;
          const apiSecret = process.env.LIVEKIT_API_SECRET;
          const wsUrl = process.env.LIVEKIT_URL;

          if (!apiKey || !apiSecret || !wsUrl) {
            return Response.json(
              { error: "Server configuration missing" },
              { status: 500 },
            );
          }

          const { accessToken } = await createLiveKitRoomJwt({
            roomName,
            identity: "candidate-" + Math.random().toString(36).slice(2, 7),
            metadata: JSON.stringify(config),
          });

          return Response.json({
            accessToken,
            url: wsUrl,
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
