import { AccessToken } from "livekit-server-sdk";
import { RoomAgentDispatch, RoomConfiguration } from "@livekit/protocol";

export type LiveKitRoomTokenGrant = {
  roomName: string;
  identity: string;
  metadata: string;
  /** Include in token grant (playground human participant). */
  canUpdateOwnMetadata?: boolean;
  agentName?: string;
};

function requireLiveKitKeys(): { apiKey: string; apiSecret: string } {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error("LIVEKIT_API_KEY and LIVEKIT_API_SECRET must be set");
  }
  return { apiKey, apiSecret };
}

/**
 * Builds a LiveKit JWT for joining a room with the shared gemini-playground agent dispatch.
 */
export async function createLiveKitRoomJwt(
  grant: LiveKitRoomTokenGrant,
): Promise<{ accessToken: string }> {
  const { apiKey, apiSecret } = requireLiveKitKeys();
  const {
    roomName,
    identity,
    metadata,
    canUpdateOwnMetadata,
    agentName = "gemini-playground",
  } = grant;

  const at = new AccessToken(apiKey, apiSecret, {
    identity,
    metadata,
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
    ...(canUpdateOwnMetadata ? { canUpdateOwnMetadata: true } : {}),
  });

  at.roomConfig = new RoomConfiguration({
    name: roomName,
    agents: [
      new RoomAgentDispatch({
        agentName,
      }),
    ],
  });

  return { accessToken: await at.toJwt() };
}
