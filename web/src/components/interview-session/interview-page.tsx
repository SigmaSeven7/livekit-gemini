"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { LiveKitRoom, RoomAudioRenderer, StartAudio, BarVisualizer, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { InterviewConfig } from "@/data/interview-options";
import { InterviewAgentProvider, useInterviewAgent } from "./interview-agent-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PhoneOff, Mic, MicOff, Play, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocalParticipant } from "@livekit/components-react";

function Transcript() {
    const { displayTranscriptions, interruptedSegmentIds, playTranscript } = useInterviewAgent();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Precise scroll to bottom logic
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [displayTranscriptions]);

    return (
        <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-6 py-8 space-y-6 scroll-smooth"
        >
            <div className="max-w-5xl mx-auto space-y-6">
                {displayTranscriptions.map(({ segment, participant }) => {
                    const isAgent = participant?.isAgent;
                    const isInterrupted = interruptedSegmentIds.has(segment.id);
                    
                    return (
                        <div key={segment.id} className={cn(
                            "flex w-full animate-in fade-in slide-in-from-bottom-2 duration-300",
                            isAgent ? "justify-start" : "justify-end"
                        )}>
                            <div className={cn(
                                "max-w-[85%] md:max-w-[70%] rounded-2xl px-5 py-4 text-base leading-relaxed group relative shadow-sm",
                                isAgent
                                    ? "bg-muted/50 text-foreground rounded-tl-sm border border-border"
                                    : "bg-primary text-primary-foreground rounded-tr-sm"
                            )}>
                                <div className="flex items-center justify-between gap-4 mb-2">
                                    <span className={cn(
                                        "text-[10px] font-bold uppercase tracking-widest",
                                        isAgent ? "text-muted-foreground" : "text-primary-foreground/80"
                                    )}>
                                        {isAgent ? "Gemini Agent" : "You"}
                                    </span>
                                    <button
                                        onClick={() => playTranscript(segment.id)}
                                        className={cn(
                                            "p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100",
                                            isAgent ? "hover:bg-foreground/10" : "hover:bg-white/20"
                                        )}
                                    >
                                        <Play className="w-3.5 h-3.5 fill-current" />
                                    </button>
                                </div>
                                
                                <p className="whitespace-pre-wrap break-words">
                                    {segment.text}
                                </p>

                                {isInterrupted && (
                                    <span className="text-xs italic block mt-2 opacity-60">
                                        (Interrupted)
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

type EndingState = 'idle' | 'saving' | 'success' | 'error';

function Controls({ onDisconnect }: { onDisconnect: () => void }) {
    const { localParticipant } = useLocalParticipant();
    const { endInterview, conversationMessages } = useInterviewAgent();
    const [isMuted, setIsMuted] = useState(false);
    const [endingState, setEndingState] = useState<EndingState>('idle');
    const [savedInterviewId, setSavedInterviewId] = useState<string | null>(null);

    const toggleMute = () => {
        if (localParticipant) {
            localParticipant.setMicrophoneEnabled(isMuted);
            setIsMuted(!isMuted);
        }
    };

    const handleEndInterview = useCallback(async () => {
        if (endingState !== 'idle') return;
        
        setEndingState('saving');
        
        try {
            const result = await endInterview();
            
            if (result.success) {
                setSavedInterviewId(result.interviewId);
                setEndingState('success');
                
                // Wait a moment to show success state, then disconnect
                setTimeout(() => {
                    onDisconnect();
                }, 1500);
            } else {
                setEndingState('error');
                
                // Allow retry after a moment
                setTimeout(() => {
                    setEndingState('idle');
                }, 3000);
            }
        } catch (error) {
            console.error('Error ending interview:', error);
            setEndingState('error');
            
            setTimeout(() => {
                setEndingState('idle');
            }, 3000);
        }
    }, [endInterview, endingState, onDisconnect]);

    const getEndButtonContent = () => {
        switch (endingState) {
            case 'saving':
                return (
                    <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Saving Interview...
                    </>
                );
            case 'success':
                return (
                    <>
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                        Saved!
                    </>
                );
            case 'error':
                return (
                    <>
                        <XCircle className="h-5 w-5 mr-2" />
                        Save Failed - Retry
                    </>
                );
            default:
                return (
                    <>
                        <PhoneOff className="h-5 w-5 mr-2" />
                        End Interview
                    </>
                );
        }
    };

    return (
        <div className="w-full bg-background/80 backdrop-blur-xl border-t border-border p-6">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
                <div className="flex-1 flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        className={cn(
                            "h-12 w-12 rounded-xl transition-all border-2", 
                            isMuted ? "border-destructive text-destructive bg-destructive/5" : "hover:border-primary"
                        )}
                        onClick={toggleMute}
                        disabled={endingState !== 'idle'}
                    >
                        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </Button>
                    
                    <div className="hidden md:block text-sm font-medium text-muted-foreground">
                        {endingState === 'saving' 
                            ? `Saving ${conversationMessages.length} messages...`
                            : isMuted 
                                ? "Microphone Muted" 
                                : "Microphone Active"
                        }
                    </div>
                </div>

                <div className="flex-1 flex justify-center">
                    <div className="h-10 w-64 bg-muted/30 rounded-full px-4 flex items-center overflow-hidden">
                        <BarVisualizer
                            state="listening"
                            barCount={7}
                            trackRef={useTracks([Track.Source.Microphone]).find(t => t.participant.isLocal)}
                            className="h-6 w-full"
                        />
                    </div>
                </div>

                <div className="flex-1 flex justify-end">
                    <Button
                        variant={endingState === 'success' ? 'secondary' : endingState === 'error' ? 'outline' : 'destructive'}
                        size="lg"
                        className={cn(
                            "h-12 px-6 rounded-xl font-semibold shadow-lg transition-all",
                            endingState === 'success' && "bg-green-600 hover:bg-green-700 shadow-green-600/20",
                            endingState === 'error' && "border-destructive text-destructive",
                            endingState === 'idle' && "shadow-destructive/10 hover:shadow-destructive/20"
                        )}
                        onClick={handleEndInterview}
                        disabled={endingState === 'saving' || endingState === 'success'}
                    >
                        {getEndButtonContent()}
                    </Button>
                </div>
            </div>
        </div>
    );
}

function InterviewSessionContent({ onDisconnect }: { onDisconnect: () => void }) {
    return (
        <div className="flex flex-col h-screen w-full bg-background overflow-hidden">
            <header className="flex items-center justify-between px-8 py-4 border-b border-border bg-background/50 backdrop-blur-sm z-20">
                <div className="flex items-center gap-3">
                    <div className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </div>
                    <h1 className="text-sm font-bold uppercase tracking-tighter">Live Session</h1>
                </div>
                <div className="px-3 py-1 bg-muted rounded-full text-[11px] font-bold text-muted-foreground">
                    ROOM_ID: LIVE_SESSION_ACTIVE
                </div>
            </header>

            <Transcript />

            <Controls onDisconnect={onDisconnect} />
        </div>
    )
}

export function InterviewPage({ roomId }: { roomId: string }) {
    const router = useRouter();
    const [token, setToken] = useState("");
    const [wsUrl, setWsUrl] = useState("");
    const [config, setConfig] = useState<InterviewConfig | null>(null);

    useEffect(() => {
        const storedConfig = sessionStorage.getItem(`interview-config-${roomId}`);
        if (storedConfig) {
            setConfig(JSON.parse(storedConfig));
        }
    }, [roomId]);

    useEffect(() => {
        if (!config) return;
        const fetchToken = async () => {
            try {
                const response = await fetch("/api/interview-token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ roomName: roomId, config }),
                });
                const data = await response.json();
                setToken(data.accessToken);
                setWsUrl(data.url);
            } catch (e) {
                console.error("Failed to get token", e);
            }
        };
        fetchToken();
    }, [config, roomId]);

    if (!token || !wsUrl) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background">
                <div className="relative flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
                <p className="mt-6 text-sm font-medium text-muted-foreground animate-pulse">Initializing Secure Environment...</p>
            </div>
        );
    }

    return (
        <LiveKitRoom
            serverUrl={wsUrl}
            token={token}
            connect={true}
            audio={true}
            className="h-screen w-full bg-background"
        >
            <InterviewAgentProvider interviewId={roomId}>
                <div className="h-full w-full flex items-center justify-center">
                    <div className="w-full h-full max-w-6xl shadow-2xl md:border-x border-border">
                        <InterviewSessionContent onDisconnect={() => router.push("/")} />
                    </div>
                </div>
                <RoomAudioRenderer />
                <StartAudio label="Enter Interview Room" />
            </InterviewAgentProvider>
        </LiveKitRoom>
    );
}