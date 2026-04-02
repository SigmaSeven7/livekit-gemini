import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import {
    useMaybeRoomContext,
    useVoiceAssistant,
    useLocalParticipant,
    useIsSpeaking,
} from "@livekit/components-react";
import type { LocalAudioTrack } from "livekit-client";
import {
    RoomEvent,
    TranscriptionSegment,
    Participant,
    TrackPublication,
    RemoteParticipant,
    type ByteStreamReader,
} from "livekit-client";
import { useSpeechCoachingAnalysis } from "@/hooks/use-speech-coaching-analysis";
import type { CoachingDataParsed, SpeechCoachingEntry } from "@/types/speech-coaching";

interface Transcription {
    segment: TranscriptionSegment;
    participant?: Participant;
    publication?: TrackPublication;
}

export type { SpeechCoachingEntry };

const COACHING_SOURCE: "client" | "agent" =
    typeof process !== "undefined" && process.env.NEXT_PUBLIC_COACHING_SOURCE === "agent"
        ? "agent"
        : "client";

interface AgentContextType {
    displayTranscriptions: Transcription[];
    agent?: RemoteParticipant;
    state: ReturnType<typeof useVoiceAssistant>["state"];
    interruptedSegmentIds: Set<string>;
    speechCoachingFeed: SpeechCoachingEntry[];
    coachingSource: "client" | "agent";
    speechCoachingClient: {
        isAnalyzing: boolean;
        error: string | null;
        lastAnalyzedAt: number | null;
    } | null;

    // End interview handler
    endInterview: () => Promise<{ success: boolean; interviewId: string }>;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

interface InterviewAgentProviderProps {
    children: React.ReactNode;
    /** The interview ID from the database */
    interviewId: string;
    /** Calibrated mic track from pre-flight (same track published to LiveKit). Used for client-side coaching. */
    calibratedTrack?: LocalAudioTrack | null;
}

export function InterviewAgentProvider({
    children,
    interviewId,
    calibratedTrack = null,
}: InterviewAgentProviderProps) {
    const room = useMaybeRoomContext();
    const { agent, state } = useVoiceAssistant();
    const { localParticipant } = useLocalParticipant();
    const isUserSpeaking = useIsSpeaking(localParticipant);
    const [rawSegments, setRawSegments] = useState<{
        [id: string]: Transcription;
    }>({});
    const [interruptedSegmentIds, setInterruptedSegmentIds] = useState<Set<string>>(new Set());
    const [displayTranscriptions, setDisplayTranscriptions] = useState<Transcription[]>([]);
    const [speechCoachingFeed, setSpeechCoachingFeed] = useState<SpeechCoachingEntry[]>([]);

    const pushCoachingEntry = useCallback((partial: Omit<SpeechCoachingEntry, "id" | "at">) => {
        const entry: SpeechCoachingEntry = {
            ...partial,
            id: crypto.randomUUID(),
            at: Date.now(),
        };
        setSpeechCoachingFeed((prev) => [...prev.slice(-7), entry]);
    }, []);

    const clientEnabled = COACHING_SOURCE === "client";
    const mediaStreamTrack = calibratedTrack?.mediaStreamTrack ?? null;

    const speechCoachingClientState = useSpeechCoachingAnalysis({
        enabled: clientEnabled,
        mediaStreamTrack,
        assistantState: state,
        pauseWhenAssistantSpeaking: true,
        pauseWhenHidden: true,
        onEntry: pushCoachingEntry,
    });

    const speechCoachingClient = useMemo(
        () =>
            clientEnabled
                ? {
                      isAnalyzing: speechCoachingClientState.isAnalyzing,
                      error: speechCoachingClientState.error,
                      lastAnalyzedAt: speechCoachingClientState.lastAnalyzedAt,
                  }
                : null,
        [clientEnabled, speechCoachingClientState],
    );

    // Handle interruption detection
    useEffect(() => {
        if (state === "listening" && isUserSpeaking) {
            const agentSegments = Object.values(rawSegments)
                .filter((t) => t.participant?.isAgent)
                .sort((a, b) => (b.segment.lastReceivedTime ?? 0) - (a.segment.lastReceivedTime ?? 0));

            if (agentSegments.length > 0) {
                const lastAgentSegment = agentSegments[0];
                setInterruptedSegmentIds((prev) => {
                    const newSet = new Set(prev);
                    newSet.add(lastAgentSegment.segment.id);
                    return newSet;
                });
            }
        }
    }, [state, rawSegments, isUserSpeaking]);

    // Handle transcription events - populate rawSegments only (no persistence)
    useEffect(() => {
        if (!room) return;

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
        if (!room || COACHING_SOURCE !== "agent") return;

        const handleByteStream = async (
            reader: ByteStreamReader,
            _participantInfo: { identity: string },
        ) => {
            try {
                const chunks = await reader.readAll();
                const blob = new Blob(chunks as BlobPart[], {
                    type: reader.info.mimeType || "application/json",
                });
                const text = await blob.text();
                const payload = JSON.parse(text) as {
                    status?: string;
                    toast?: string;
                    data?: CoachingDataParsed;
                    coaching?: SpeechCoachingEntry["coaching"];
                    message?: string;
                    model?: string;
                };

                if (payload.status === "error") {
                    pushCoachingEntry({
                        source: "agent",
                        error: payload.message ?? "Speech coaching error",
                    });
                    return;
                }

                if (payload.toast !== undefined || payload.data) {
                    pushCoachingEntry({
                        source: "agent",
                        toast: payload.toast,
                        data: payload.data,
                        model: payload.model,
                    });
                    return;
                }

                if (payload.coaching) {
                    pushCoachingEntry({
                        source: "agent",
                        coaching: payload.coaching,
                        model: payload.model,
                    });
                }
            } catch (e) {
                console.error("speech_coaching byte stream:", e);
            }
        };

        room.registerByteStreamHandler("speech_coaching", handleByteStream);

        return () => {
            room.unregisterByteStreamHandler("speech_coaching");
        };
    }, [room, pushCoachingEntry]);

    // Merge segments for display
    useEffect(() => {
        const sorted = Object.values(rawSegments).sort(
            (a, b) => (a.segment.firstReceivedTime ?? 0) - (b.segment.firstReceivedTime ?? 0),
        );
        const mergedSorted = sorted.reduce((acc, current) => {
            if (acc.length === 0) {
                return [current];
            }

            const last = acc[acc.length - 1];
            if (
                last.participant === current.participant &&
                last.participant?.isAgent &&
                (current.segment.firstReceivedTime ?? 0) - (last.segment.lastReceivedTime ?? 0) <= 1000 &&
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
            const updateResponse = await fetch(`/api/interviews/${interviewId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "completed" }),
            });

            if (!updateResponse.ok) {
                console.error("Failed to update interview status:", await updateResponse.json().catch(() => null));
            }

            return { success: updateResponse.ok, interviewId };
        } catch (error) {
            console.error("Error ending interview:", error);
            return { success: false, interviewId };
        }
    }, [interviewId]);

    return (
        <AgentContext.Provider
            value={{
                displayTranscriptions,
                agent,
                state,
                interruptedSegmentIds,
                speechCoachingFeed,
                coachingSource: COACHING_SOURCE,
                speechCoachingClient,
                endInterview,
            }}
        >
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
