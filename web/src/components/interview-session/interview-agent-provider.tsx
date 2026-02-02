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
} from "livekit-client";
import { useAudioPlayback } from "@/hooks/use-audio-playback";

interface Transcription {
    segment: TranscriptionSegment;
    participant?: Participant;
    publication?: TrackPublication;
}

interface AgentContextType {
    displayTranscriptions: Transcription[];
    agent?: RemoteParticipant;
    state: ReturnType<typeof useVoiceAssistant>['state'];
    interruptedSegmentIds: Set<string>;
    playTranscript: (id: string) => void;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export function InterviewAgentProvider({ children }: { children: React.ReactNode }) {
    const room = useMaybeRoomContext();
    const { agent, state, audioTrack } = useVoiceAssistant();
    const { localParticipant } = useLocalParticipant();
    const isUserSpeaking = useIsSpeaking(localParticipant);
    const [rawSegments, setRawSegments] = useState<{
        [id: string]: Transcription;
    }>({});
    const [interruptedSegmentIds, setInterruptedSegmentIds] = useState<Set<string>>(new Set());

    // Initialize audio playback with the agent's audio track
    const agentAudioPlayback = useAudioPlayback(audioTrack?.publication?.track?.mediaStreamTrack);
    const userAudioPlayback = useAudioPlayback(localParticipant?.getTrackPublication(Track.Source.Microphone)?.track?.mediaStreamTrack);

    useEffect(() => {
        if (state === 'listening' && isUserSpeaking) {
            const agentSegments = Object.values(rawSegments)
                .filter(t => t.participant?.isAgent)
                .sort((a, b) => (b.segment.lastReceivedTime ?? 0) - (a.segment.lastReceivedTime ?? 0));

            if (agentSegments.length > 0) {
                const lastAgentSegment = agentSegments[0];
                setInterruptedSegmentIds(prev => {
                    const newSet = new Set(prev);
                    newSet.add(lastAgentSegment.segment.id);
                    return newSet;
                });
            }
        }
    }, [state, rawSegments, isUserSpeaking]);

    const [displayTranscriptions, setDisplayTranscriptions] = useState<
        Transcription[]
    >([]);

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
                return [
                    ...acc.slice(0, -1),
                    {
                        ...current,
                        segment: {
                            ...current.segment,
                            text: `${last.segment.text} ${current.segment.text}`,
                            id: current.segment.id,
                            firstReceivedTime: last.segment.firstReceivedTime,
                            lastReceivedTime: current.segment.lastReceivedTime,
                        },
                    },
                ];
            } else {
                return [...acc, current];
            }
        }, [] as Transcription[]);
        setDisplayTranscriptions(mergedSorted);
    }, [rawSegments]);

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
        <AgentContext.Provider value={{ displayTranscriptions, agent, state, interruptedSegmentIds, playTranscript }}>
            {children}
        </AgentContext.Provider>
    );
}

export function useInterviewAgent() {
    const context = useContext(AgentContext);
    if (context === undefined) {
        throw new Error("useInterviewAgent must be used within an InterviewAgentProvider");
    }
    return context;
}
