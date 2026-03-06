"use client";

import React from "react";
import type { LocalAudioTrack } from "livekit-client";
import { usePreFlightAudio } from "@/hooks/use-preflight-audio";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Mic, Shield, AlertCircle } from "lucide-react";

interface PreFlightAudioCheckProps {
  onSuccess: (track: LocalAudioTrack) => void;
  roomId?: string;
  successButtonLabel?: string;
}

export function PreFlightAudioCheck({
  onSuccess,
  successButtonLabel = "Enter Interview Room",
}: PreFlightAudioCheckProps) {
  const {
    track,
    volume,
    isCalibrated,
    krispEnabled,
    error,
    markTransferred,
  } = usePreFlightAudio();

  const handleEnterInterview = () => {
    if (!track || !isCalibrated) return;
    markTransferred();
    onSuccess(track);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-8">
        <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20">
          <AlertCircle className="h-6 w-6 text-destructive shrink-0" />
          <div>
            <p className="font-medium text-destructive">Microphone Access Failed</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          Please allow microphone access in your browser and try again.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-8 p-8">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Mic Check</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          Please read this sentence aloud: &quot;I am ready for my interview.&quot;
        </p>
      </div>

      {track && (
        <div className="w-full max-w-sm space-y-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Mic className="h-3.5 w-3.5" />
              Input level
            </span>
            {volume >= 0.4 && (
              <span className="text-green-600 font-medium flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Good
              </span>
            )}
          </div>
          <div className="relative">
            <Progress
              value={volume * 100}
              className={cn(
                "h-3 transition-all duration-150",
                volume >= 0.4 && "[&_[data-slot=progress-indicator]]:bg-green-500"
              )}
            />
          </div>
        </div>
      )}

      {krispEnabled && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-grey-500">
          <Shield className="h-3.5 w-3.5" />
          Krisp Enhanced Filtering Enabled
        </div>
      )}

      <Button
        size="lg"
        onClick={handleEnterInterview}
        disabled={!isCalibrated || !track}
        className="min-w-[200px]"
      >
        {successButtonLabel}
      </Button>

      {!track && (
        <p className="text-xs text-muted-foreground animate-pulse">
          Initializing microphone...
        </p>
      )}
    </div>
  );
}
