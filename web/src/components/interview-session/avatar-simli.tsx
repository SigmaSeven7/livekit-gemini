"use client";

import React, { useRef, useEffect, useState } from "react";
import { useTracks } from "@livekit/components-react";
import { Track } from "livekit-client";

interface AvatarSimliProps {
  className?: string;
  isActive?: boolean;
}

export function AvatarSimli({ className = "", isActive = true }: AvatarSimliProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const avatarTracks = useTracks([Track.Source.Camera]);
  
  // Find the agent's camera track (Simli avatar)
  const avatarTrack = avatarTracks.find(track => track.participant.isAgent);
  
  // Handle loading state
  useEffect(() => {
    if (avatarTrack) {
      setIsLoading(false);
      setError(null);
    } else if (!isLoading) {
      // If we were loaded but now no track, might be an issue
      setIsLoading(true);
    }
  }, [avatarTrack, isLoading]);
  
  // Handle video element attachment
  useEffect(() => {
    if (videoRef.current && avatarTrack) {
      const liveKitTrack = avatarTrack.publication?.track;
      if (liveKitTrack && liveKitTrack.mediaStreamTrack) {
        const mediaStream = new MediaStream([liveKitTrack.mediaStreamTrack]);
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(err => {
          console.error("Error playing video:", err);
          setError("Failed to play avatar video");
        });
      }
    }
  }, [avatarTrack, videoRef]);
  
  if (!isActive) {
    return <div className={className} />;
  }
  
  if (error) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center h-full text-muted-foreground bg-muted/20">
          <div className="text-center p-4">
            <p className="text-sm font-medium">{error}</p>
            <p className="text-xs mt-2 opacity-70">Avatar unavailable</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className={className}>
      {isLoading ? (
        <div className="flex items-center justify-center h-full text-muted-foreground bg-muted/20">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm">Loading avatar...</p>
          </div>
        </div>
      ) : avatarTrack ? (
        <video 
          ref={videoRef}
          autoPlay 
          playsInline
          muted
          className="w-full h-full object-cover"
          onLoadedData={() => setIsLoading(false)}
          onError={() => {
            setError("Failed to load avatar video stream");
            setIsLoading(false);
          }}
        />
      ) : (
        <div className="flex items-center justify-center h-full text-muted-foreground bg-muted/20">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm">Waiting for avatar...</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AvatarSimli;
