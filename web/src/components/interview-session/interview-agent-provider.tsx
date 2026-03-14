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
            console.log("[InterviewAgentProvider] No room available yet");
            return;
        }

        console.log("[InterviewAgentProvider] Setting up transcription listener for room:", room.name);

        const updateRawSegments = (
            segments: TranscriptionSegment[],
            participant?: Participant,
            publication?: TrackPublication,
        ) => {
            console.log("[InterviewAgentProvider] Transcription received:", {
                segmentCount: segments.length,
                participantIdentity: participant?.identity,
                participantIsAgent: participant?.isAgent,
                trackSid: publication?.trackSid,
                segments: segments.map(s => ({ id: s.id, text: s.text?.substring(0, 50) + '...', fromAgent: s.fromAgent }))
            });

            setRawSegments((prev) => {
                const newSegments = { ...prev };
                for (const segment of segments) {
                    newSegments[segment.id] = { segment, participant, publication };
                }
                return newSegments;
            });
        };

        room.on(RoomEvent.TranscriptionReceived, updateRawSegments);

        console.log("[InterviewAgentProvider] Transcription listener registered");

        // Log existing participants
        console.log("[InterviewAgentProvider] Remote participants:", 
            Array.from(room.remoteParticipants.values()).map(p => ({
                identity: p.identity,
                sid: p.sid,
                isAgent: p.isAgent,
                tracks: Array.from(p.tracks.values()).map(t => ({
                    sid: t.trackSid,
                    source: t.source,
                    muted: t.isMuted
                }))
            }))
        );

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

    // End interview handler - calls the API which handles fetching from agent, processing with Groq, and cleanup
    const endInterview = React.useCallback(async (): Promise<{ success: boolean; interviewId: string }> => {
        try {
            console.log('Ending interview...');

            // The API handles fetching data from agent, processing with Groq, storing in DB, and cleaning up
            const updateResponse = await fetch(`/api/interviews/${interviewId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'completed' }),
            });

            const success = updateResponse.ok;
            if (success) {
                console.log('Interview marked as completed and processed');
            } else {
                const error = await updateResponse.json();
                console.error('Failed to update interview status:', error);
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
