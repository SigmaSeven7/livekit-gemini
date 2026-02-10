/**
 * POST /api/audio/upload
 * 
 * Uploads a single audio segment to storage.
 * Receives base64-encoded WAV audio and stores it in the filesystem.
 * Returns the URL for the uploaded file.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDefaultStorage, getAudioStoragePath, MAX_AUDIO_SIZE_BYTES } from '@/lib/storage';
import { base64ToBuffer } from '@/lib/audio/wav-encoder';

interface SingleUploadRequest {
  interviewId: string;
  transcriptId: string;
  audioBase64: string;
}

interface SingleUploadResponse {
  success: boolean;
  url?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SingleUploadRequest = await request.json();
    const { interviewId, transcriptId, audioBase64 } = body;

    if (!interviewId) {
      return NextResponse.json(
        { success: false, error: 'interviewId is required' } as SingleUploadResponse,
        { status: 400 }
      );
    }

    if (!transcriptId) {
      return NextResponse.json(
        { success: false, error: 'transcriptId is required' } as SingleUploadResponse,
        { status: 400 }
      );
    }

    if (!audioBase64) {
      return NextResponse.json(
        { success: false, error: 'audioBase64 is required' } as SingleUploadResponse,
        { status: 400 }
      );
    }

    // Validate file size to prevent memory exhaustion
    // Base64 encoding increases size by ~33%, so we estimate original size
    const estimatedSizeBytes = Math.ceil(audioBase64.length * 0.75);

    if (estimatedSizeBytes > MAX_AUDIO_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: 'Audio file too large (max 10MB)' } as SingleUploadResponse,
        { status: 413 }
      );
    }

    const storage = getDefaultStorage();

    // Convert base64 to buffer
    const audioBuffer = base64ToBuffer(audioBase64);

    // Generate storage path
    const storagePath = getAudioStoragePath(interviewId, transcriptId);

    // Upload to storage
    const url = await storage.upload(storagePath, audioBuffer, 'audio/wav');

    const response: SingleUploadResponse = {
      success: true,
      url,
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Single audio upload error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload audio' } as SingleUploadResponse,
      { status: 500 }
    );
  }
}
