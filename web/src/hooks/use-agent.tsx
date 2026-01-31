import React, { createContext, useContext, useState, useEffect } from "react";
import {
  useMaybeRoomContext,
  useVoiceAssistant,
  useLocalParticipant,
  useIsSpeaking,
} from "@livekit/components-react";
import {
  RoomEvent,
  TranscriptionSegment,
  Participant,
  TrackPublication,
  RemoteParticipant,
  Track,
  type RpcInvocationData,
} from "livekit-client";
import { useConnection } from "@/hooks/use-connection";
import { useToast } from "@/hooks/use-toast";
import { useAudioPlayback } from "@/hooks/use-audio-playback";

interface Transcription {
  segment: TranscriptionSegment;
  participant?: Participant;
  publication?: TrackPublication;
}

interface GeneratedImage {
  prompt: string;
  imageUrl: string;
  timestamp: number;
}

interface AgentContextType {
  displayTranscriptions: Transcription[];
  agent?: RemoteParticipant;
  generatedImages: GeneratedImage[];
  playTranscript: (id: string) => void;
  state: ReturnType<typeof useVoiceAssistant>['state'];
  interruptedSegmentIds: Set<string>;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const room = useMaybeRoomContext();
  const { shouldConnect } = useConnection();
  const { agent, state, audioTrack } = useVoiceAssistant(); // Get state
  const { localParticipant } = useLocalParticipant();
  const isUserSpeaking = useIsSpeaking(localParticipant);
  const [rawSegments, setRawSegments] = useState<{
    [id: string]: Transcription;
  }>({});
  const [interruptedSegmentIds, setInterruptedSegmentIds] = useState<Set<string>>(new Set());

  // Handle interruption: When state changes to 'listening' while agent was speaking, 
  // we might want to ensure the transcript reflects the cut-off.
  // Actually, LiveKit agents usually send a final transcript update or a new event.
  // But if the user says "stop", we can force a check.

  useEffect(() => {
    // Only mark as interrupted if state becomes 'listening' AND the user is currently speaking.
    // This distinguishes natural completion (user not speaking) from interruption (user speaking).
    if (state === 'listening' && isUserSpeaking) {
      // Agent was interrupted. Find the latest agent segment and mark it.
      // We need to look at 'displayTranscriptions' to find the last agent segment.
      // But we can't depend on displayTranscriptions in this effect or it might loop or be stale?
      // Actually we can just check rawSegments logic or rely on the fact that if we are listening, the LAST segment that was actively being typed should be cut off.

      // Let's use a functional update or just read the current state if available.
      // Since displayTranscriptions is derived from rawSegments, let's find the candidate in rawSegments that looks like the "current" one.
      // However, displayTranscriptions has the "merged" ID. 

      // Better approach: When state goes to listening, find the LATEST agent segment received so far.
      const agentSegments = Object.values(rawSegments)
        .filter(t => t.participant?.isAgent)
        .sort((a, b) => (b.segment.lastReceivedTime ?? 0) - (a.segment.lastReceivedTime ?? 0));

      if (agentSegments.length > 0) {
        const lastAgentSegment = agentSegments[0];
        // Only mark if it looks recent enough? Or just always mark the last one if we are interrupted?
        // If the agent finished speaking 10 seconds ago, we shouldn't mark it.
        // But 'listening' implies we JUST entered this state from 'speaking' (usually).

        // Let's check if the segment is effectively "live".
        // For simplicity, we can just add the ID. If it's old, it doesn't matter if we freeze it (it's already done).
        // If it's typing, it will stop.
        setInterruptedSegmentIds(prev => {
          const newSet = new Set(prev);
          newSet.add(lastAgentSegment.segment.id);
          return newSet;
        });
      }
    }
  }, [state, rawSegments, isUserSpeaking]); // detecting state change to listening
  const [displayTranscriptions, setDisplayTranscriptions] = useState<
    Transcription[]
  >([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const { toast } = useToast();

  // Initialize audio playback with the agent's audio track
  const agentAudioPlayback = useAudioPlayback(audioTrack?.publication?.track?.mediaStreamTrack);
  const userAudioPlayback = useAudioPlayback(localParticipant?.getTrackPublication(Track.Source.Microphone)?.track?.mediaStreamTrack);

  useEffect(() => {
    if (!room) {
      return;
    }
    const updateRawSegments = (
      segments: TranscriptionSegment[],
      participant?: Participant,
      publication?: TrackPublication,
    ) => {
      setRawSegments((prev) => {
        const newSegments = { ...prev };
        for (const segment of segments) {
          newSegments[segment.id] = { segment, participant, publication };
        }
        return newSegments;
      });
    };
    room.on(RoomEvent.TranscriptionReceived, updateRawSegments);

    return () => {
      room.off(RoomEvent.TranscriptionReceived, updateRawSegments);
    };
  }, [room]);

  useEffect(() => {
    if (localParticipant) {
      localParticipant.registerRpcMethod(
        "pg.toast",
        async (data: RpcInvocationData) => {
          const { title, description, variant } = JSON.parse(data.payload);
          console.log(title, description, variant);
          toast({
            title,
            description,
            variant,
          });
          return JSON.stringify({ shown: true });
        },
      );
    }
  }, [localParticipant, toast]);

  // Register byte stream handler for images
  useEffect(() => {
    if (!room || !shouldConnect) return;

    const handleByteStream = async (reader: any, participantInfo: any) => {
      try {
        console.log('Byte stream received:', reader.info);

        // Get the prompt from attributes
        const prompt = reader.info.attributes?.prompt || 'Generated image';
        const timestamp = reader.info.timestamp || Date.now();

        // Read all chunks from the stream
        const chunks = await reader.readAll();

        // Create a blob from the chunks
        const blob = new Blob(chunks, { type: reader.info.mimeType || 'image/jpeg' });
        const imageUrl = URL.createObjectURL(blob);

        // Add to generated images
        setGeneratedImages(prev => [
          ...prev,
          {
            prompt,
            imageUrl,
            timestamp
          }
        ]);

        console.log('Image received and processed:', prompt);
      } catch (error) {
        console.error('Failed to process byte stream:', error);
      }
    };

    room.registerByteStreamHandler('nano_banana_image', handleByteStream);

    return () => {
      room.unregisterByteStreamHandler('nano_banana_image');
    };
  }, [room, shouldConnect]);

  useEffect(() => {
    const sorted = Object.values(rawSegments).sort(
      (a, b) =>
        (a.segment.firstReceivedTime ?? 0) - (b.segment.firstReceivedTime ?? 0),
    );
    const mergedSorted = sorted.reduce((acc, current) => {
      if (acc.length === 0) {
        return [current];
      }

      const last = acc[acc.length - 1];
      if (
        last.participant === current.participant &&
        last.participant?.isAgent &&
        (current.segment.firstReceivedTime ?? 0) -
        (last.segment.lastReceivedTime ?? 0) <=
        1000 &&
        !last.segment.id.startsWith("status-") &&
        !current.segment.id.startsWith("status-")
      ) {
        // Merge segments from the same participant if they're within 1 second of each other
        return [
          ...acc.slice(0, -1),
          {
            ...current,
            segment: {
              ...current.segment,
              text: `${last.segment.text} ${current.segment.text}`,
              id: current.segment.id, // Use the id of the latest segment
              firstReceivedTime: last.segment.firstReceivedTime, // Keep the original start time
              lastReceivedTime: current.segment.lastReceivedTime, // Update last received time
            },
          },
        ];
      } else {
        return [...acc, current];
      }
    }, [] as Transcription[]);
    setDisplayTranscriptions(mergedSorted);
  }, [rawSegments]);

  useEffect(() => {
    if (shouldConnect) {
      setRawSegments({});
      setDisplayTranscriptions([]);
      setGeneratedImages([]);
      setInterruptedSegmentIds(new Set());
    }
  }, [shouldConnect]);

  const playTranscript = (id: string) => {
    const transcription = rawSegments[id];

    // Find if this ID is part of a merged segment in displayTranscriptions
    const displayedSegment = displayTranscriptions.find(t => t.segment.id === id);

    // Determine which playback instance to use
    const isAgent = displayedSegment?.participant?.isAgent ?? transcription?.participant?.isAgent ?? false;
    const playback = isAgent ? agentAudioPlayback : userAudioPlayback;

    if (displayedSegment && displayedSegment.segment.firstReceivedTime && displayedSegment.segment.lastReceivedTime) {
      const startTime = displayedSegment.segment.firstReceivedTime;
      const duration = displayedSegment.segment.lastReceivedTime - startTime;

      const offsetMs = isAgent ? 1000 : 2500;
      playback.playSlice(startTime - offsetMs, duration + offsetMs + 500);
    } else if (transcription && transcription.segment.firstReceivedTime && transcription.segment.lastReceivedTime) {
      // Fallback to raw segment
      const startTime = transcription.segment.firstReceivedTime;
      const duration = transcription.segment.lastReceivedTime - startTime;

      const offsetMs = isAgent ? 1000 : 3000;
      playback.playSlice(startTime - offsetMs, duration + offsetMs + 500);
    }
  };

  return (
    <AgentContext.Provider value={{ displayTranscriptions, agent, generatedImages, playTranscript, state, interruptedSegmentIds }}>
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error("useAgent must be used within an AgentProvider");
  }
  return context;
}
