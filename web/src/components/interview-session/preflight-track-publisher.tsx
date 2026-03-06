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
    if (!calibratedTrack || publishedRef.current) return;

    const publish = async () => {
      if (room.state !== ConnectionState.Connected) return;
      if (publishedRef.current) return;

      try {
        await room.localParticipant.publishTrack(calibratedTrack, {
          source: Track.Source.Microphone,
        });
        publishedRef.current = true;
      } catch (e) {
        console.error("Failed to publish pre-flight track:", e);
      }
    };

    if (room.state === ConnectionState.Connected) {
      publish();
    } else {
      room.on("connected", publish);
      return () => {
        room.off("connected", publish);
      };
    }
  }, [room, calibratedTrack]);

  return null;
}
