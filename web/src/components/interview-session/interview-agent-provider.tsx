import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
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
import { useConversationState, UseConversationStateReturn } from "@/hooks/use-conversation-state";
import { ConversationMessage } from "@/types/conversation";

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
    
    // Conversation state
    conversation: UseConversationStateReturn;
    conversationMessages: ConversationMessage[];
    
    // End interview handler
    endInterview: () => Promise<{ success: boolean; interviewId: string }>;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

// Map to track LiveKit segment ID -> our transcript ID
type SegmentMapping = {
    transcriptId: string;
    lastUpdated: number;
    isFinalized: boolean;
};

export function InterviewAgentProvider({ children }: { children: React.ReactNode }) {
    const room = useMaybeRoomContext();
    const { agent, state, audioTrack } = useVoiceAssistant();
    const { localParticipant } = useLocalParticipant();
    const isUserSpeaking = useIsSpeaking(localParticipant);
    const [rawSegments, setRawSegments] = useState<{
        [id: string]: Transcription;
    }>({});
    const [interruptedSegmentIds, setInterruptedSegmentIds] = useState<Set<string>>(new Set());

    // Initialize conversation state
    const conversation = useConversationState();

    // Map LiveKit segment IDs to our conversation transcript IDs
    const segmentMappingRef = useRef<Map<string, SegmentMapping>>(new Map());
    
    // Track which segments have had their audio finalized
    const finalizedSegmentsRef = useRef<Set<string>>(new Set());
    
    // Track previous agent state to detect state changes
    const prevAgentStateRef = useRef<string | null>(null);

    // Initialize audio playback with the agent's audio track
    const agentAudioPlayback = useAudioPlayback(audioTrack?.publication?.track?.mediaStreamTrack);
    const userAudioPlayback = useAudioPlayback(localParticipant?.getTrackPublication(Track.Source.Microphone)?.track?.mediaStreamTrack);

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

    const [displayTranscriptions, setDisplayTranscriptions] = useState<
        Transcription[]
    >([]);

    // Handle transcription events and update conversation state
    useEffect(() => {
        if (!room) {
            return;
        }
        
        const updateRawSegments = (
            segments: TranscriptionSegment[],
            participant?: Participant,
            publication?: TrackPublication,
        ) => {
            const now = Date.now();
            
            setRawSegments((prev) => {
                const newSegments = { ...prev };
                for (const segment of segments) {
                    newSegments[segment.id] = { segment, participant, publication };
                    
                    // Check if this segment already exists in our conversation
                    const mapping = segmentMappingRef.current.get(segment.id);
                    
                    if (!mapping) {
                        // New segment - add to conversation
                        const participantType = participant?.isAgent ? 'agent' : 'user';
                        const transcriptId = conversation.addMessage({
                            participant: participantType,
                            transcript: segment.text,
                            timestampStart: segment.firstReceivedTime ?? now,
                            timestampEnd: segment.lastReceivedTime ?? now,
                        });
                        
                        segmentMappingRef.current.set(segment.id, {
                            transcriptId,
                            lastUpdated: now,
                            isFinalized: false,
                        });
                    } else {
                        // Existing segment - update it
                        conversation.updateMessage(mapping.transcriptId, {
                            transcript: segment.text,
                            timestampEnd: segment.lastReceivedTime ?? now,
                        });
                        
                        mapping.lastUpdated = now;
                        mapping.isFinalized = false;
                    }
                }
                return newSegments;
            });
        };
        
        room.on(RoomEvent.TranscriptionReceived, updateRawSegments);

        return () => {
            room.off(RoomEvent.TranscriptionReceived, updateRawSegments);
        };
    }, [room, conversation]);

    // Helper function to finalize a segment's audio
    const finalizeSegmentAudio = useCallback((segmentId: string, mapping: SegmentMapping) => {
        // Skip already finalized segments
        if (mapping.isFinalized || finalizedSegmentsRef.current.has(segmentId)) {
            return;
        }
        
        // Get the segment data
        const transcription = rawSegments[segmentId];
        if (!transcription?.segment) {
            return;
        }
        
        const { segment, participant } = transcription;
        const isAgent = participant?.isAgent ?? false;
        
        // Get timestamps
        const startTime = segment.firstReceivedTime;
        const endTime = segment.lastReceivedTime;
        
        if (!startTime || !endTime) {
            return;
        }
        
        // Calculate duration with offsets that account for transcription processing latency
        const startOffsetMs = isAgent ? 1500 : 3000;
        const endOffsetMs = isAgent ? 2000 : 3500;
        const adjustedStart = startTime - startOffsetMs;
        const duration = (endTime - startTime) + startOffsetMs + endOffsetMs;
        
        // Extract audio based on participant type
        const playback = isAgent ? agentAudioPlayback : userAudioPlayback;
        const audioBase64 = playback.extractAudioAsBase64(adjustedStart, duration);
        
        if (audioBase64) {
            conversation.finalizeMessageAudio(mapping.transcriptId, audioBase64);
            console.log(`Finalized audio for segment ${segmentId} (${isAgent ? 'agent' : 'user'}), size: ${audioBase64.length} chars`);
        }
        
        // Mark as finalized
        mapping.isFinalized = true;
        finalizedSegmentsRef.current.add(segmentId);
    }, [rawSegments, conversation, agentAudioPlayback, userAudioPlayback]);

    // Track previous user speaking state
    const prevUserSpeakingRef = useRef<boolean>(false);

    // Finalize segments when:
    // 1. segment.final === true (LiveKit says it's complete)
    // 2. Agent state changes from "speaking" to "listening" (agent stopped speaking)
    // 3. User stops speaking (for user segments)
    // 4. Fallback: 10 seconds after last update (safety net)
    useEffect(() => {
        const FALLBACK_DELAY = 10000; // 10 seconds fallback
        
        const interval = setInterval(() => {
            const now = Date.now();
            
            segmentMappingRef.current.forEach((mapping, segmentId) => {
                if (mapping.isFinalized || finalizedSegmentsRef.current.has(segmentId)) {
                    return;
                }
                
                const transcription = rawSegments[segmentId];
                if (!transcription?.segment) {
                    return;
                }
                
                const { segment } = transcription;
                
                // Condition 1: LiveKit marked the segment as final
                if (segment.final) {
                    console.log(`Segment ${segmentId} marked final by LiveKit`);
                    finalizeSegmentAudio(segmentId, mapping);
                    return;
                }
                
                // Condition 4 (fallback): Segment hasn't been updated in 10 seconds
                if (now - mapping.lastUpdated > FALLBACK_DELAY) {
                    console.log(`Segment ${segmentId} finalized by timeout fallback`);
                    finalizeSegmentAudio(segmentId, mapping);
                }
            });
        }, 500);
        
        return () => clearInterval(interval);
    }, [rawSegments, finalizeSegmentAudio]);

    // Finalize all pending agent segments when agent stops speaking
    useEffect(() => {
        const prevState = prevAgentStateRef.current;
        prevAgentStateRef.current = state;
        
        // Detect when agent transitions from speaking to listening
        if (prevState === 'speaking' && state === 'listening') {
            console.log('Agent stopped speaking, finalizing pending agent segments...');
            
            // Small delay to ensure all transcription events have arrived
            setTimeout(() => {
                segmentMappingRef.current.forEach((mapping, segmentId) => {
                    if (mapping.isFinalized || finalizedSegmentsRef.current.has(segmentId)) {
                        return;
                    }
                    
                    const transcription = rawSegments[segmentId];
                    if (!transcription?.segment || !transcription?.participant?.isAgent) {
                        return;
                    }
                    
                    console.log(`Finalizing agent segment ${segmentId} due to state change`);
                    finalizeSegmentAudio(segmentId, mapping);
                });
            }, 500);
        }
    }, [state, rawSegments, finalizeSegmentAudio]);

    // Finalize user segments when user stops speaking
    useEffect(() => {
        const wasUserSpeaking = prevUserSpeakingRef.current;
        prevUserSpeakingRef.current = isUserSpeaking;
        
        // Detect when user transitions from speaking to not speaking
        if (wasUserSpeaking && !isUserSpeaking) {
            console.log('User stopped speaking, finalizing pending user segments...');
            
            // Delay to ensure transcription is complete
            setTimeout(() => {
                segmentMappingRef.current.forEach((mapping, segmentId) => {
                    if (mapping.isFinalized || finalizedSegmentsRef.current.has(segmentId)) {
                        return;
                    }
                    
                    const transcription = rawSegments[segmentId];
                    // Only finalize user segments (not agent)
                    if (!transcription?.segment || transcription?.participant?.isAgent) {
                        return;
                    }
                    
                    console.log(`Finalizing user segment ${segmentId} due to user stopped speaking`);
                    finalizeSegmentAudio(segmentId, mapping);
                });
            }, 1000); // Wait 1s for user transcription to complete
        }
    }, [isUserSpeaking, rawSegments, finalizeSegmentAudio]);

    // Merge segments for display (same logic as before)
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

    // Play transcript - try stored audio first, fallback to live buffer
    const playTranscript = useCallback((id: string) => {
        const transcription = rawSegments[id];
        const displayedSegment = displayTranscriptions.find(t => t.segment.id === id);
        const isAgent = displayedSegment?.participant?.isAgent ?? transcription?.participant?.isAgent ?? false;
        const playback = isAgent ? agentAudioPlayback : userAudioPlayback;

        // Check if we have stored audio for this segment
        const mapping = segmentMappingRef.current.get(id);
        if (mapping) {
            const message = conversation.getMessage(mapping.transcriptId);
            if (message?.audioBase64) {
                // Play from stored base64
                playback.playFromBase64(message.audioBase64);
                return;
            }
            if (message?.audioUrl) {
                // TODO: Fetch and play from URL
                // For now, fall back to live buffer
            }
        }

        // Fallback to live buffer playback
        // Use large offsets to account for transcription processing latency
        const startOffsetMs = isAgent ? 1500 : 3000;  // Buffer before first word
        const endOffsetMs = isAgent ? 2000 : 3500;    // Buffer AFTER lastReceivedTime
        
        if (displayedSegment && displayedSegment.segment.firstReceivedTime && displayedSegment.segment.lastReceivedTime) {
            const startTime = displayedSegment.segment.firstReceivedTime;
            const duration = displayedSegment.segment.lastReceivedTime - startTime;
            playback.playSlice(startTime - startOffsetMs, duration + startOffsetMs + endOffsetMs);
        } else if (transcription && transcription.segment.firstReceivedTime && transcription.segment.lastReceivedTime) {
            const startTime = transcription.segment.firstReceivedTime;
            const duration = transcription.segment.lastReceivedTime - startTime;
            playback.playSlice(startTime - startOffsetMs, duration + startOffsetMs + endOffsetMs);
        }
    }, [rawSegments, displayTranscriptions, conversation, agentAudioPlayback, userAudioPlayback]);

    // End interview handler - uploads audio and saves to database
    const endInterview = useCallback(async (): Promise<{ success: boolean; interviewId: string }> => {
        try {
            console.log('Ending interview, uploading audio...');
            
            // Upload all pending audio - returns updated messages with audioUrls
            const uploadResult = await conversation.uploadPendingAudio();
            if (!uploadResult.success) {
                console.warn('Some audio uploads may have failed');
            }
            
            // Save to database with the updated messages (bypasses React state timing issue)
            console.log('Saving interview to database...');
            const saveSuccess = await conversation.saveToDatabase('completed', uploadResult.messages);
            
            return {
                success: saveSuccess,
                interviewId: conversation.interviewId,
            };
        } catch (error) {
            console.error('Error ending interview:', error);
            return {
                success: false,
                interviewId: conversation.interviewId,
            };
        }
    }, [conversation]);

    return (
        <AgentContext.Provider value={{
            displayTranscriptions,
            agent,
            state,
            interruptedSegmentIds,
            playTranscript,
            conversation,
            conversationMessages: conversation.messages,
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
