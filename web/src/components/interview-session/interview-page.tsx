"use client";

import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useRoomContext,
} from "@livekit/components-react";
import type { LocalAudioTrack } from "livekit-client";
import dynamic from "next/dynamic";
import { InterviewAgentProvider, useInterviewAgent } from "./interview-agent-provider";
import { toast } from "@/hooks/use-toast";
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
import type { InterviewLanguage } from "@/data/interview-options";
import type { CoachingSessionStaticContext } from "@/lib/speech-coaching-context";
import { getSpeechCoachingUiStrings, isSpeechCoachingRtl } from "@/lib/speech-coaching-ui";
import { cn } from "@/lib/utils";

function interviewLanguageFromConfig(config: Record<string, unknown> | null): InterviewLanguage {
    const v = config?.interview_language;
    if (v === "English" || v === "Hebrew" || v === "Russian" || v === "Arabic") {
        return v;
    }
    return "English";
}
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhoneOff, Mic, MicOff, Loader2, CheckCircle2, XCircle, UserRound, MessageSquare, ChevronDown, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocalParticipant } from "@livekit/components-react";

function topEmotionScores(scores: Record<string, number> | undefined, n: number) {
    if (!scores) return [];
    return Object.entries(scores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([name, v]) => `${name} ${(v * 100).toFixed(0)}%`);
}

function SpeechCoachingPanel() {
    const { speechCoachingFeed, speechCoachingClient, coachingSource, interviewLanguage } = useInterviewAgent();
    const [open, setOpen] = useState(true);
    const latest = speechCoachingFeed[speechCoachingFeed.length - 1];
    const ui = getSpeechCoachingUiStrings(interviewLanguage);
    const rtl = isSpeechCoachingRtl(interviewLanguage);

    const liveLine = latest
        ? (latest.toast?.trim() ||
              latest.data?.live_toast?.trim() ||
              (latest.coaching ? `${latest.coaching.tone}` : ""))
        : "";

    useEffect(() => {
        if (!latest || latest.error) return;
        const line = latest.toast?.trim() || latest.data?.live_toast?.trim();
        if (!line) return;
        toast({
            title: ui.toastTitle,
            description: line,
            duration: 3500,
        });
    }, [latest, ui.toastTitle]);

    return (
        <div
            dir={rtl ? "rtl" : "ltr"}
            className="shrink-0 border-b border-border bg-muted/15 px-3 sm:px-5 py-2 sm:py-3"
        >
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full items-center justify-between gap-2 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
            >
                <span className="flex items-center gap-2 min-w-0">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
                    <span className="truncate">{ui.panelTitle}</span>
                    {speechCoachingClient?.isAnalyzing && (
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                    )}
                </span>
                <ChevronDown
                    className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")}
                    aria-hidden
                />
            </button>
            {open && (
                <div className="mt-3 space-y-3 text-sm">
                    {!latest ? (
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {coachingSource === "client" ? ui.emptyClient : ui.emptyAgent}
                        </p>
                    ) : latest.error ? (
                        <p className="text-xs text-destructive leading-relaxed">{latest.error}</p>
                    ) : (
                        <div className="space-y-3 rounded-xl border border-border/70 bg-background/70 p-3 sm:p-4 shadow-sm">
                            {liveLine && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
                                        {ui.now}
                                    </p>
                                    <p className="text-foreground/95 text-sm font-medium leading-relaxed">{liveLine}</p>
                                </div>
                            )}

                            {latest.data?.metrics && (
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    {typeof latest.data.metrics.confidence === "number" && (
                                        <div>
                                            <p className="text-[10px] font-bold uppercase text-muted-foreground">
                                                {ui.confidence}
                                            </p>
                                            <p className="text-foreground/90">
                                                {(latest.data.metrics.confidence * 100).toFixed(0)}%
                                            </p>
                                        </div>
                                    )}
                                    {typeof latest.data.metrics.clarity === "number" && (
                                        <div>
                                            <p className="text-[10px] font-bold uppercase text-muted-foreground">
                                                {ui.clarity}
                                            </p>
                                            <p className="text-foreground/90">
                                                {(latest.data.metrics.clarity * 100).toFixed(0)}%
                                            </p>
                                        </div>
                                    )}
                                    {latest.data.metrics.pacing && (
                                        <div className="col-span-2">
                                            <p className="text-[10px] font-bold uppercase text-muted-foreground">
                                                {ui.pacing}
                                            </p>
                                            <p className="text-foreground/90 capitalize">
                                                {latest.data.metrics.pacing}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {topEmotionScores(latest.data?.emotions?.scores, 4).length > 0 && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
                                        {ui.emotions}
                                    </p>
                                    <p className="text-xs text-foreground/85 leading-relaxed">
                                        {topEmotionScores(latest.data?.emotions?.scores, 4).join(" · ")}
                                    </p>
                                </div>
                            )}

                            {latest.data?.internal_summary && (
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
                                        {ui.summary}
                                    </p>
                                    <p className="text-xs text-foreground/85 leading-relaxed">
                                        {latest.data.internal_summary}
                                    </p>
                                </div>
                            )}

                            {latest.coaching && (
                                <>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
                                            {ui.tone}
                                        </p>
                                        <p className="text-foreground/90 text-sm leading-relaxed">
                                            {latest.coaching.tone}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
                                            {ui.vocabulary}
                                        </p>
                                        <p className="text-foreground/90 text-sm leading-relaxed">
                                            {latest.coaching.vocabulary}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
                                            {ui.clarity}
                                        </p>
                                        <p className="text-foreground/90 text-sm leading-relaxed">
                                            {latest.coaching.clarity}
                                        </p>
                                    </div>
                                    {latest.coaching.suggestions?.length > 0 && (
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">
                                                {ui.suggestions}
                                            </p>
                                            <ul className="list-disc pl-4 space-y-1 text-sm text-foreground/90">
                                                {latest.coaching.suggestions.map((s) => (
                                                    <li key={`${latest.id}-${s.slice(0, 48)}`}>{s}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </>
                            )}

                            {latest.model && (
                                <p className="text-[10px] text-muted-foreground/80 pt-1 border-t border-border/50">
                                    {ui.modelLabel}: {latest.model}
                                </p>
                            )}
                        </div>
                    )}
                    {speechCoachingClient?.error && (
                        <p className="text-[11px] text-destructive/90">{speechCoachingClient.error}</p>
                    )}
                </div>
            )}
        </div>
    );
}

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
    }, [endInterview, endingState, onDisconnect, room]);

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

                    <span className="text-[11px] sm:text-sm font-medium text-muted-foreground max-w-[4.5rem] sm:max-w-none truncate sm:whitespace-normal">
                        {endingState === 'saving'
                            ? `Saving...`
                            : isMuted
                                ? "Muted"
                                : "Live"
                        }
                    </span>
                </div>

                <div className="flex-1" aria-hidden />

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

function useInterviewLayoutIsMobile() {
    const [isMobile, setIsMobile] = useState(
        () => typeof window !== "undefined" && window.innerWidth < 768,
    );

    useEffect(() => {
        const mq = window.matchMedia("(max-width: 767px)");
        const sync = () => setIsMobile(mq.matches);
        sync();
        mq.addEventListener("change", sync);
        return () => mq.removeEventListener("change", sync);
    }, []);

    return isMobile;
}

function InterviewSessionContent({ onDisconnect }: { onDisconnect: () => void }) {
    const isMobileLayout = useInterviewLayoutIsMobile();

    const sessionHeader = (
        <header className="flex shrink-0 items-center justify-between px-4 sm:px-8 py-3 sm:py-4 border-b border-border bg-background/50 backdrop-blur-sm z-20">
            <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex h-3 w-3 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
                </div>
                <h1 className="text-sm font-bold uppercase tracking-tighter truncate">Live Session</h1>
            </div>
            <div className="px-2 sm:px-3 py-1 bg-muted rounded-full text-[10px] sm:text-[11px] font-bold text-muted-foreground shrink-0">
                LIVE
            </div>
        </header>
    );

    if (isMobileLayout) {
        return (
            <div className="flex h-[100dvh] min-h-0 w-full flex-col bg-background overflow-hidden">
                {sessionHeader}

                <Tabs defaultValue="transcript" className="flex min-h-0 flex-1 flex-col">
                    <div className="shrink-0 border-b border-border bg-background/80 px-3 pt-2 pb-2">
                        <TabsList
                            className="grid h-11 w-full grid-cols-2 gap-1 rounded-xl border border-border bg-muted/50 p-1"
                            aria-label="Interview view"
                        >
                            <TabsTrigger
                                value="avatar"
                                className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                            >
                                <UserRound className="h-4 w-4 shrink-0" aria-hidden />
                                <span className="text-xs font-semibold sm:text-sm">Avatar</span>
                            </TabsTrigger>
                            <TabsTrigger
                                value="transcript"
                                className="gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                            >
                                <MessageSquare className="h-4 w-4 shrink-0" aria-hidden />
                                <span className="text-xs font-semibold sm:text-sm">Transcript</span>
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent
                        value="avatar"
                        className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden focus-visible:outline-none"
                    >
                        <div className="flex min-h-0 flex-1 items-stretch border-b border-border/50">
                            <Avatar3D modelPath="/male.glb" className="h-full min-h-[220px] w-full" isActive={true} />
                        </div>
                    </TabsContent>

                    <TabsContent
                        value="transcript"
                        className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden focus-visible:outline-none"
                    >
                        <SpeechCoachingPanel />
                        <Transcript />
                    </TabsContent>
                </Tabs>

                <div className="shrink-0">
                    <Controls onDisconnect={onDisconnect} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-[100dvh] min-h-0 w-full flex-col bg-background overflow-hidden md:h-screen">
            {sessionHeader}

            <div className="flex min-h-0 flex-1 overflow-hidden">
                <div className="flex w-1/3 min-w-[300px] max-w-[400px] border-r border-border">
                    <Avatar3D modelPath="/male.glb" className="h-full w-full scale-90" isActive={true} />
                </div>

                <div className="flex min-w-0 flex-1 flex-col min-h-0">
                    <SpeechCoachingPanel />
                    <Transcript />
                    <Controls onDisconnect={onDisconnect} />
                </div>
            </div>
        </div>
    );
}

function coachingSessionStaticFromConfig(
    config: Record<string, unknown> | null,
): CoachingSessionStaticContext | undefined {
    if (!config) return undefined;
    const role = typeof config.candidate_role === "string" ? config.candidate_role : undefined;
    const jd = typeof config.job_description === "string" ? config.job_description : undefined;
    const rawQs = config.questions;
    let planned: string[] = [];
    if (Array.isArray(rawQs)) {
        planned = rawQs
            .map((item) => {
                if (item && typeof item === "object" && item !== null && "question" in item) {
                    return String((item as { question: unknown }).question ?? "");
                }
                return "";
            })
            .filter((s) => s.length > 0);
    }
    const hasAny = role || jd || planned.length > 0;
    if (!hasAny) return undefined;
    return {
        candidateRole: role,
        jobDescriptionSnippet: jd ? jd.slice(0, 600) : undefined,
        plannedQuestionsPreview: planned.length > 0 ? planned : undefined,
    };
}

export function InterviewPage({ roomId }: { roomId: string }) {
    const router = useRouter();
    const [configForToken, setConfigForToken] = useState<Record<string, unknown> | null>(null);
    const [token, setToken] = useState("");
    const [wsUrl, setWsUrl] = useState("");
    const [setupError, setSetupError] = useState<string | null>(null);
    const [calibratedTrack, setCalibratedTrack] = useState<LocalAudioTrack | null>(null);

    // Derived: pre-flight is complete once the mic track exists
    const preFlightPassed = calibratedTrack !== null;

    // 1. Fetch interview config (runs immediately on mount; token fetch waits for pre-flight)
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

                setConfigForToken({
                    ...interview.config,
                    questions: interview.questions ?? [],
                });
            } catch (e) {
                if (cancelled) return;
                console.error("Interview setup failed:", e);
                setSetupError(e instanceof Error ? e.message : "Failed to start interview. Please try again.");
            }
        };

        init();
        return () => { cancelled = true; };
    }, [roomId]);

    // 2. Fetch LiveKit token once mic track is ready and config is loaded
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
        return () => { cancelled = true; };
    }, [preFlightPassed, roomId, configForToken]);

    const handlePreFlightSuccess = useCallback((track: LocalAudioTrack) => {
        setCalibratedTrack(track);
    }, []);

    const coachingSessionStatic = useMemo(
        () => coachingSessionStaticFromConfig(configForToken),
        [configForToken],
    );

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
                    <PreFlightAudioCheck onSuccess={handlePreFlightSuccess} />
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
            <InterviewAgentProvider
                interviewId={roomId}
                calibratedTrack={calibratedTrack}
                interviewLanguage={interviewLanguageFromConfig(configForToken)}
                coachingSessionStatic={coachingSessionStatic}
            >
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