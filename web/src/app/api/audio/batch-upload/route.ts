/**
 * POST /api/audio/batch-upload
 * 
 * Uploads multiple audio segments to storage.
 * Receives base64-encoded WAV audio and stores it in the filesystem.
 * Returns URLs for each uploaded file.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDefaultStorage, getAudioStoragePath } from '@/lib/storage';
import { BatchUploadRequest, BatchUploadResponse } from '@/types/conversation';
import { base64ToBuffer } from '@/lib/audio/wav-encoder';

export async function POST(request: NextRequest) {
  try {
    const body: BatchUploadRequest = await request.json();
    const { interviewId, segments } = body;

    if (!interviewId) {
      return NextResponse.json(
        { error: 'interviewId is required' },
        { status: 400 }
      );
    }

    if (!segments || !Array.isArray(segments) || segments.length === 0) {
      return NextResponse.json(
        { error: 'segments array is required and must not be empty' },
        { status: 400 }
      );
    }

    const storage = getDefaultStorage();
    const urls: Record<string, string> = {};

    // Process each segment
    for (const segment of segments) {
      const { transcriptId, audioBase64 } = segment;

      if (!transcriptId || !audioBase64) {
        console.warn(`Skipping segment with missing data: transcriptId=${transcriptId}`);
        continue;
      }

      try {
        // Convert base64 to buffer
        const audioBuffer = base64ToBuffer(audioBase64);

        // Generate storage path
        const storagePath = getAudioStoragePath(interviewId, transcriptId);

        // Upload to storage
        const url = await storage.upload(storagePath, audioBuffer, 'audio/wav');

        urls[transcriptId] = url;
      } catch (error) {
        console.error(`Failed to upload segment ${transcriptId}:`, error);
        // Continue processing other segments
      }
    }

    const response: BatchUploadResponse = { urls };
    return NextResponse.json(response);
  } catch (error) {
    console.error('Batch upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process batch upload' },
      { status: 500 }
    );
  }
}
