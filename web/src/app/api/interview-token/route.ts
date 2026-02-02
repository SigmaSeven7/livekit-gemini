import { AccessToken } from "livekit-server-sdk";
import { RoomAgentDispatch, RoomConfiguration } from '@livekit/protocol';
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), "../.env.local") });

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { config, roomName } = body;

        const apiKey = process.env.LIVEKIT_API_KEY;
        const apiSecret = process.env.LIVEKIT_API_SECRET;
        const wsUrl = process.env.LIVEKIT_URL;

        if (!apiKey || !apiSecret || !wsUrl) {
            return Response.json(
                { error: "Server configuration missing" },
                { status: 500 }
            );
        }

        // Create participant metadata from the interview config
        const metadata = JSON.stringify(config);

        // Create access token
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

        // Explicitly dispatch the agent to this room
        at.roomConfig = new RoomConfiguration({
            name: roomName,
            agents: [
                new RoomAgentDispatch({
                    agentName: 'gemini-playground',
                }),
            ],
        });

        return Response.json({
            accessToken: await at.toJwt(),
            url: wsUrl,
        });
    } catch (error) {
        return Response.json(
            { error: "Error generating token", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
