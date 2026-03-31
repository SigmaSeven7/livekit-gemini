"use client";

import React from "react";
import type { LocalAudioTrack } from "livekit-client";
import { usePreFlightAudio } from "@/hooks/use-preflight-audio";
import { Button } from "@/components/ui/button";
import { Shield, AlertCircle } from "lucide-react";

interface PreFlightAudioCheckProps {
  onSuccess: (track: LocalAudioTrack) => void;
  successButtonLabel?: string;
}

export function PreFlightAudioCheck({
  onSuccess,
  successButtonLabel = "Enter Interview Room",
}: PreFlightAudioCheckProps) {
  const { track, krispEnabled, error, markTransferred } = usePreFlightAudio();

  const handleEnterInterview = () => {
    if (!track) return;
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
        <h2 className="text-xl font-semibold">Microphone</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          Your microphone will be used for the interview. Click below when you are ready to join.
        </p>
      </div>

      {krispEnabled && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-gray-500">
          <Shield className="h-3.5 w-3.5" />
          Krisp Enhanced Filtering Enabled
        </div>
      )}

      <Button
        size="lg"
        onClick={handleEnterInterview}
        disabled={!track}
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
