import { createFileRoute } from "@tanstack/react-router";
import { AccessToken } from "livekit-server-sdk";
import { RoomAgentDispatch, RoomConfiguration } from "@livekit/protocol";

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

          const metadata = JSON.stringify(config);

          const at = new AccessToken(apiKey, apiSecret, {
            identity: "candidate-" + Math.random().toString(36).slice(2, 7),
            metadata: metadata,
          });

          at.addGrant({
            room: roomName,
            roomJoin: true,
            canPublish: true,
            canPublishData: true,
            canSubscribe: true,
          });

          at.roomConfig = new RoomConfiguration({
            name: roomName,
            agents: [
              new RoomAgentDispatch({
                agentName: "gemini-playground",
              }),
            ],
          });

          return Response.json({
            accessToken: await at.toJwt(),
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
