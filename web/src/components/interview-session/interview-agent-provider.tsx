import React, { createContext, useContext, useState, useEffect, useRef } from "react";
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
} from "livekit-client";

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

    // End interview handler
    endInterview: () => Promise<{ success: boolean; interviewId: string }>;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

interface InterviewAgentProviderProps {
    children: React.ReactNode;
    /** The interview ID from the database */
    interviewId: string;
}

export function InterviewAgentProvider({ children, interviewId }: InterviewAgentProviderProps) {
    const room = useMaybeRoomContext();
    const { agent, state } = useVoiceAssistant();
    const { localParticipant } = useLocalParticipant();
    const isUserSpeaking = useIsSpeaking(localParticipant);
    const [rawSegments, setRawSegments] = useState<{
        [id: string]: Transcription;
    }>({});
    const [interruptedSegmentIds, setInterruptedSegmentIds] = useState<Set<string>>(new Set());
    const [displayTranscriptions, setDisplayTranscriptions] = useState<Transcription[]>([]);

    // Handle interruption detection
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

    // Handle transcription events - populate rawSegments only (no persistence)
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

    // Merge segments for display
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

    // End interview handler - fetches transcripts from agent, syncs to web, then marks completed
    const endInterview = React.useCallback(async (): Promise<{ success: boolean; interviewId: string }> => {
        try {
            console.log('Ending interview...');

            const audioServerUrl = process.env.NEXT_PUBLIC_AUDIO_SERVER_URL || 'http://localhost:3001';
            let messages: Array<{ transcriptId: string; interviewId: string; participant: string; transcript: string; timestampStart: number; timestampEnd: number; audioUrl: string | null; audioBase64: string | null }> = [];

            try {
                const transcriptsRes = await fetch(
                    `${audioServerUrl}/getTranscripts?id=${encodeURIComponent(interviewId)}`
                );
                if (transcriptsRes.ok) {
                    const data = await transcriptsRes.json();
                    const raw = data.transcripts ?? [];
                    messages = raw.map((t: { participant: string }) => ({
                        ...t,
                        participant: t.participant === 'candidate' ? 'user' : t.participant,
                    }));
                }
            } catch (e) {
                console.warn('Could not fetch transcripts for sync:', e);
            }

            const updateResponse = await fetch(`/api/interviews/${interviewId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'completed', messages }),
            });

            const success = updateResponse.ok;
            if (success) {
                console.log('Interview marked as completed');
            } else {
                console.error('Failed to update interview status');
            }

            return {
                success,
                interviewId,
            };
        } catch (error) {
            console.error('Error ending interview:', error);
            return {
                success: false,
                interviewId,
            };
        }
    }, [interviewId]);

    return (
        <AgentContext.Provider value={{
            displayTranscriptions,
            agent,
            state,
            interruptedSegmentIds,
            endInterview,
        }}>
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
