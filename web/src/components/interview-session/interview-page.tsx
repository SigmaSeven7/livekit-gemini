// "use client";

// import React, { useEffect, useState } from "react";
// import { LiveKitRoom, RoomAudioRenderer, StartAudio, BarVisualizer, useTracks } from "@livekit/components-react";
// import { Track } from "livekit-client";
// import { InterviewConfig } from "@/data/interview-options";
// import { InterviewAgentProvider, useInterviewAgent } from "./interview-agent-provider";
// import { cn } from "@/lib/utils";
// import { Button } from "@/components/ui/button";
// import { PhoneOff, Mic, MicOff, Play } from "lucide-react";
// import { useRouter } from "next/navigation";
// import { useLocalParticipant } from "@livekit/components-react";

// function Transcript() {
//     const { displayTranscriptions, agent, interruptedSegmentIds, playTranscript } = useInterviewAgent();
//     const transcriptEndRef = React.useRef<HTMLDivElement>(null);

//     React.useEffect(() => {
//         // Auto-scroll to bottom when new transcriptions arrive
//         transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
//     }, [displayTranscriptions]);

//     return (
//         <div className="flex-1 overflow-y-auto p-4 space-y-4">
//             {displayTranscriptions.map(({ segment, participant }) => {
//                 const isAgent = participant?.isAgent;
//                 const isInterrupted = interruptedSegmentIds.has(segment.id);
//                 return (
//                     <div key={segment.id} className={cn(
//                         "flex w-full",
//                         isAgent ? "justify-start" : "justify-end"
//                     )}>
//                         <div className={cn(
//                             "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed group relative",
//                             isAgent
//                                 ? "bg-bg2 text-fg1 rounded-tl-sm"
//                                 : "bg-sky-500 text-white rounded-tr-sm"
//                         )}>
//                             <div className="flex items-center justify-between gap-2 mb-1">
//                                 <div className={cn(
//                                     "text-xs font-semibold uppercase tracking-wide",
//                                     isAgent ? "opacity-70" : "text-white/90"
//                                 )}>
//                                     {isAgent ? "Agent" : "You"}
//                                 </div>
//                                 <button
//                                     onClick={() => playTranscript(segment.id)}
//                                     className={cn(
//                                         "p-1 rounded-full transition-colors opacity-0 group-hover:opacity-100",
//                                         isAgent 
//                                             ? "hover:bg-white/10" 
//                                             : "hover:bg-white/20"
//                                     )}
//                                     title="Play audio"
//                                 >
//                                     <Play className={cn(
//                                         "w-3 h-3",
//                                         isAgent ? "text-fg2" : "text-white"
//                                     )} />
//                                 </button>
//                             </div>
//                             <div className={cn(
//                                 "leading-relaxed whitespace-pre-wrap break-words",
//                                 isAgent ? "" : "text-white"
//                             )}>
//                                 {segment.text}
//                             </div>
//                             {isInterrupted && (
//                                 <span className={cn(
//                                     "text-xs italic block mt-1",
//                                     isAgent ? "opacity-70" : "text-white/70"
//                                 )}>
//                                     (Interrupted)
//                                 </span>
//                             )}
//                         </div>
//                     </div>
//                 );
//             })}
//             <div ref={transcriptEndRef} />
//         </div>
//     );
// }

// function Controls({ onDisconnect }: { onDisconnect: () => void }) {
//     const { localParticipant } = useLocalParticipant();
//     const [isMuted, setIsMuted] = useState(false);

//     const toggleMute = () => {
//         if (localParticipant) {
//             localParticipant.setMicrophoneEnabled(isMuted);
//             setIsMuted(!isMuted);
//         }
//     }

//     return (
//         <div className="flex items-center justify-center gap-6 p-6 border-t border-separator1 bg-bg1/50 backdrop-blur-md">
//             <Button
//                 variant="outline"
//                 size="icon"
//                 className={cn("h-14 w-14 rounded-full border-2", isMuted ? "border-red-500 text-red-500" : "border-fg3 hover:border-fg1")}
//                 onClick={toggleMute}
//             >
//                 {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
//             </Button>

//             <div className="h-12 w-48 flex items-center justify-center">
//                 <BarVisualizer
//                     state="listening"
//                     barCount={5}
//                     trackRef={useTracks([Track.Source.Microphone]).find(t => t.participant.isLocal)}
//                     className="h-full w-full"
//                 />
//             </div>

//             <Button
//                 variant="destructive"
//                 size="icon"
//                 className="h-14 w-14 rounded-full shadow-lg hover:shadow-red-500/20 transition-all"
//                 onClick={onDisconnect}
//             >
//                 <PhoneOff className="h-6 w-6" />
//             </Button>
//         </div>
//     )
// }

// function InterviewSessionContent({ onDisconnect }: { onDisconnect: () => void }) {
//     return (
//         <div className="flex flex-col h-full max-w-3xl mx-auto w-full bg-bg1 shadow-2xl rounded-none md:rounded-2xl border-x border-separator1 overflow-hidden">

//             <header className="flex items-center justify-between px-6 py-4 border-b border-separator1 bg-bg1/80 backdrop-blur text-sm font-medium tracking-wide sticky top-0 z-10">
//                 <div className="flex items-center gap-2">
//                     <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
//                     <span>Live Interview</span>
//                 </div>
//                 <div className="text-fg3">
//                     Gemini Interviewer
//                 </div>
//             </header>

//             <Transcript />

//             <Controls onDisconnect={onDisconnect} />
//         </div>
//     )
// }

// export function InterviewPage({ roomId }: { roomId: string }) {
//     const router = useRouter();
//     const [token, setToken] = useState("");
//     const [wsUrl, setWsUrl] = useState("");
//     const [config, setConfig] = useState<InterviewConfig | null>(null);

//     useEffect(() => {
//         // Load config
//         const storedConfig = sessionStorage.getItem(`interview-config-${roomId}`);
//         if (storedConfig) {
//             setConfig(JSON.parse(storedConfig));
//         } else {
//             // Handle missing config (redirect or show error)
//             // router.push("/");
//         }
//     }, [roomId, router]);

//     useEffect(() => {
//         if (!config) return;

//         const fetchToken = async () => {
//             try {
//                 const response = await fetch("/api/interview-token", {
//                     method: "POST",
//                     headers: { "Content-Type": "application/json" },
//                     body: JSON.stringify({ roomName: roomId, config }),
//                 });
//                 const data = await response.json();
//                 setToken(data.accessToken);
//                 setWsUrl(data.url);
//             } catch (e) {
//                 console.error("Failed to get token", e);
//             }
//         };

//         fetchToken();
//     }, [config, roomId]);

//     const handleDisconnect = () => {
//         router.push("/");
//     };

//     if (!token || !wsUrl) {
//         return (
//             <div className="flex flex-col items-center justify-center h-screen space-y-4">
//                 <div className="w-12 h-12 border-4 border-accent1 border-t-transparent rounded-full animate-spin" />
//                 <p className="text-fg3 animate-pulse">Preparing your interview environment...</p>
//             </div>
//         );
//     }

//     return (
//         <LiveKitRoom
//             serverUrl={wsUrl}
//             token={token}
//             connect={true}
//             audio={true}
//             className="h-screen w-full bg-bg0 flex items-center justify-center md:p-8"
//         >
//             <InterviewAgentProvider>
//                 <InterviewSessionContent onDisconnect={handleDisconnect} />
//                 <RoomAudioRenderer />
//                 <StartAudio label="Click to Start Interview" />
//             </InterviewAgentProvider>
//         </LiveKitRoom>
//     );
// }


"use client";

import React, { useEffect, useState, useRef } from "react";
import { LiveKitRoom, RoomAudioRenderer, StartAudio, BarVisualizer, useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";
import { InterviewConfig } from "@/data/interview-options";
import { InterviewAgentProvider, useInterviewAgent } from "./interview-agent-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PhoneOff, Mic, MicOff, Play } from "lucide-react";
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

function Controls({ onDisconnect }: { onDisconnect: () => void }) {
    const { localParticipant } = useLocalParticipant();
    const [isMuted, setIsMuted] = useState(false);

    const toggleMute = () => {
        if (localParticipant) {
            localParticipant.setMicrophoneEnabled(isMuted);
            setIsMuted(!isMuted);
        }
    }

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
                    >
                        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </Button>
                    
                    <div className="hidden md:block text-sm font-medium text-muted-foreground">
                        {isMuted ? "Microphone Muted" : "Microphone Active"}
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
                        variant="destructive"
                        size="lg"
                        className="h-12 px-6 rounded-xl font-semibold shadow-lg shadow-destructive/10 hover:shadow-destructive/20"
                        onClick={onDisconnect}
                    >
                        <PhoneOff className="h-5 w-5 mr-2" />
                        End Interview
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
            <InterviewAgentProvider>
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