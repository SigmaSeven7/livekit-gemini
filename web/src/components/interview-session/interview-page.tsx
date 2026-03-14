"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  BarVisualizer,
  useTracks,
  useRoomContext,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import type { LocalAudioTrack } from "livekit-client";
import dynamic from "next/dynamic";
import { InterviewAgentProvider, useInterviewAgent } from "./interview-agent-provider";
import { PreFlightTrackPublisher } from "./preflight-track-publisher";

const PreFlightAudioCheck = dynamic(
    () =>
        import("./preflight-audio-check").then((m) => ({
            default: m.PreFlightAudioCheck,
        })),
    { ssr: false }
);

const Avatar3D = dynamic(
    () =>
        import("./avatar-3d").then((m) => ({
            default: m.Avatar3D,
        })),
    { ssr: false }
);
import { usePreFlightContext } from "@/contexts/preflight-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PhoneOff, Mic, MicOff, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocalParticipant } from "@livekit/components-react";

function Transcript() {
    const { displayTranscriptions, interruptedSegmentIds } = useInterviewAgent();
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
            className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6 scroll-smooth"
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
    const room = useRoomContext();
    const { endInterview } = useInterviewAgent();
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
                
                // Disconnect from the LiveKit room — this triggers the agent's
                // close_on_disconnect shutdown so it stops speaking immediately.
                setTimeout(async () => {
                    await room.disconnect();
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
        <div className="w-full bg-background/80 backdrop-blur-xl border-t border-border p-3 sm:p-6">
            <div className="max-w-6xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
                {/* Mic Button */}
                <div className="flex items-center gap-2 sm:gap-4">
                    <Button
                        variant="outline"
                        size="icon"
                        className={cn(
                            "h-10 w-10 sm:h-12 sm:w-12 rounded-xl transition-all border-2", 
                            isMuted ? "border-destructive text-destructive bg-destructive/5" : "hover:border-primary"
                        )}
                        onClick={toggleMute}
                        disabled={endingState !== 'idle'}
                    >
                        {isMuted ? <MicOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Mic className="h-4 w-4 sm:h-5 sm:w-5" />}
                    </Button>

                    <span className="hidden sm:block text-xs sm:text-sm font-medium text-muted-foreground">
                        {endingState === 'saving'
                            ? `Saving...`
                            : isMuted
                                ? "Muted"
                                : "Live"
                        }
                    </span>
                </div>

                {/* Audio Visualizer - Hidden on small mobile */}
                <div className="hidden xs:flex flex-1 justify-center max-w-[200px] sm:max-w-[256px]">
                    <div className="h-8 sm:h-10 w-32 sm:w-64 bg-muted/30 rounded-full px-2 sm:px-4 flex items-center overflow-hidden">
                        <BarVisualizer
                            state="listening"
                            barCount={5}
                            trackRef={useTracks([Track.Source.Microphone]).find(t => t.participant.isLocal)}
                            className="h-4 sm:h-6 w-full"
                        />
                    </div>
                </div>

                {/* End Button */}
                <div className="flex items-center">
                    <Button
                        variant={endingState === 'success' ? 'secondary' : endingState === 'error' ? 'outline' : 'destructive'}
                        size="sm"
                        className={cn(
                            "h-10 sm:h-12 px-3 sm:px-6 rounded-xl font-semibold shadow-lg transition-all text-xs sm:text-sm",
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
            <header className="flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 border-b border-border bg-background/50 backdrop-blur-sm z-20">
                <div className="flex items-center gap-3">
                    <div className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </div>
                    <h1 className="text-sm font-bold uppercase tracking-tighter">Live Session</h1>
                </div>
                <div className="px-2 sm:px-3 py-1 bg-muted rounded-full text-[10px] sm:text-[11px] font-bold text-muted-foreground">
                    LIVE
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Avatar Section - Desktop only */}
                <div className="hidden md:flex w-1/3 min-w-[300px] max-w-[400px] border-r border-border">
                    <Avatar3D modelPath="/male.glb" className="h-full w-full scale-90" isActive={true} />
                </div>
                
                {/* Transcript Section - Always visible */}
                <div className="flex-1 flex flex-col">
                    <Transcript />
                    <Controls onDisconnect={onDisconnect} />
                </div>
            </div>
        </div>
    )
}

export function InterviewPage({ roomId }: { roomId: string }) {
    const router = useRouter();
    const { takeAndClearTrack } = usePreFlightContext();
    const [configForToken, setConfigForToken] = useState<Record<string, unknown> | null>(null);
    const [token, setToken] = useState("");
    const [wsUrl, setWsUrl] = useState("");
    const [setupError, setSetupError] = useState<string | null>(null);
    const [preFlightPassed, setPreFlightPassed] = useState(false);
    const [calibratedTrack, setCalibratedTrack] = useState<LocalAudioTrack | null>(null);

    // Check for track from setup-form pre-flight (passed before navigation) — run once on mount
    useEffect(() => {
        const trackFromContext = takeAndClearTrack();
        if (trackFromContext) {
            setCalibratedTrack(trackFromContext);
            setPreFlightPassed(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 1. Fetch interview config only (no token yet)
    useEffect(() => {
        let cancelled = false;

        const init = async () => {
            try {
                const interviewRes = await fetch(`/api/history?id=${roomId}`);
                if (!interviewRes.ok) {
                    throw new Error(`Failed to load interview: ${interviewRes.status}`);
                }
                const interview = await interviewRes.json();
                if (!interview?.config) {
                    throw new Error("Interview configuration not found.");
                }

                if (cancelled) return;

                const configWithQuestions = {
                    ...interview.config,
                    questions: interview.questions ?? [],
                };
                setConfigForToken(configWithQuestions);
            } catch (e) {
                if (cancelled) return;
                console.error("Interview setup failed:", e);
                setSetupError(e instanceof Error ? e.message : "Failed to start interview. Please try again.");
            }
        };

        init();
        return () => {
            cancelled = true;
        };
    }, [roomId]);

    // 2. Fetch token only after pre-flight passes
    useEffect(() => {
        if (!preFlightPassed || !configForToken) return;

        let cancelled = false;

        const fetchToken = async () => {
            try {
                const tokenRes = await fetch("/api/interview-token", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ roomName: roomId, config: configForToken }),
                });
                if (!tokenRes.ok) {
                    throw new Error(`Token request failed: ${tokenRes.status}`);
                }
                const tokenData = await tokenRes.json();
                if (!tokenData.accessToken || !tokenData.url) {
                    throw new Error("Invalid token response from server.");
                }

                if (cancelled) return;
                setToken(tokenData.accessToken);
                setWsUrl(tokenData.url);
            } catch (e) {
                if (cancelled) return;
                console.error("Token fetch failed:", e);
                setSetupError(e instanceof Error ? e.message : "Failed to connect. Please try again.");
            }
        };

        fetchToken();
        return () => {
            cancelled = true;
        };
    }, [preFlightPassed, roomId, configForToken]);

    const handlePreFlightSuccess = useCallback((track: LocalAudioTrack) => {
        setCalibratedTrack(track);
        setPreFlightPassed(true);
    }, []);

    if (setupError) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background gap-4">
                <p className="text-sm font-medium text-destructive">{setupError}</p>
                <button
                    onClick={() => router.push("/")}
                    className="px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                >
                    Go Back
                </button>
            </div>
        );
    }

    // Config still loading
    if (!configForToken) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background">
                <div className="relative flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
                <p className="mt-6 text-sm font-medium text-muted-foreground animate-pulse">
                    Initializing Secure Environment...
                </p>
            </div>
        );
    }

    // Pre-flight audio check (before room connection)
    if (!preFlightPassed) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background">
                <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-lg">
                    <PreFlightAudioCheck onSuccess={handlePreFlightSuccess} roomId={roomId} />
                </div>
            </div>
        );
    }

    // Token loading after pre-flight pass
    if (!token || !wsUrl) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-background">
                <div className="relative flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
                <p className="mt-6 text-sm font-medium text-muted-foreground animate-pulse">
                    Connecting to interview...
                </p>
            </div>
        );
    }

    return (
        <LiveKitRoom
            serverUrl={wsUrl}
            token={token}
            connect={true}
            audio={false}
            className="h-screen w-full bg-background"
        >
            <InterviewAgentProvider interviewId={roomId}>
                <PreFlightTrackPublisher calibratedTrack={calibratedTrack} />
                <div className="h-full w-full flex items-center justify-center">
                    <div className="w-full h-full shadow-2xl md:border-x border-border">
                        <InterviewSessionContent onDisconnect={() => router.push("/")} />
                    </div>
                </div>
                <RoomAudioRenderer />
            </InterviewAgentProvider>
        </LiveKitRoom>
    );
}