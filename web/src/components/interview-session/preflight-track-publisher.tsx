"use client";

import { useEffect, useRef } from "react";
import { useRoomContext } from "@livekit/components-react";
import { ConnectionState, Track } from "livekit-client";
import type { LocalAudioTrack } from "livekit-client";

interface PreFlightTrackPublisherProps {
  calibratedTrack: LocalAudioTrack | null;
}

export function PreFlightTrackPublisher({
  calibratedTrack,
}: PreFlightTrackPublisherProps) {
  const room = useRoomContext();
  const publishedRef = useRef(false);

  useEffect(() => {
    if (!calibratedTrack) {
      console.log("[PreFlightTrackPublisher] No calibrated track available");
      return;
    }

    const publish = async () => {
      if (room.state !== ConnectionState.Connected) {
        console.log("[PreFlightTrackPublisher] Room not connected yet, state:", room.state);
        return;
      }
      if (publishedRef.current) {
        console.log("[PreFlightTrackPublisher] Track already published");
        return;
      }

      try {
        console.log("[PreFlightTrackPublisher] Publishing calibrated track...");
        console.log("[PreFlightTrackPublisher] Track info:", {
          id: calibratedTrack.id,
          sid: calibratedTrack.sid,
          muted: calibratedTrack.isMuted,
          source: Track.Source.Microphone
        });
        
        await room.localParticipant.publishTrack(calibratedTrack, {
          source: Track.Source.Microphone,
        });
        
        publishedRef.current = true;
        console.log("[PreFlightTrackPublisher] Track published successfully!");
        console.log("[PreFlightTrackPublisher] Local participant SID:", room.localParticipant.sid);
        console.log("[PreFlightTrackPublisher] Published tracks:", room.localParticipant.tracks);
      } catch (e) {
        console.error("[PreFlightTrackPublisher] Failed to publish track:", e);
      }
    };

    if (room.state === ConnectionState.Connected) {
      console.log("[PreFlightTrackPublisher] Room already connected, publishing immediately");
      publish();
    } else {
      console.log("[PreFlightTrackPublisher] Waiting for room connection...");
      room.on("connected", publish);
      return () => {
        room.off("connected", publish);
      };
    }
  }, [room, calibratedTrack]);

  return null;
}
