/**
 * GET /api/audio/files/[...path]
 * 
 * Serves audio files from the filesystem storage.
 * This route handles requests like /api/audio/files/interviewId/transcriptId.wav
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDefaultStorage } from '@/lib/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    
    if (!pathSegments || pathSegments.length === 0) {
      return NextResponse.json(
        { error: 'File path is required' },
        { status: 400 }
      );
    }

    // Reconstruct the storage path
    const storagePath = pathSegments.join('/');
    const storage = getDefaultStorage();

    // Check if file exists
    const exists = await storage.exists(storagePath);
    if (!exists) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Download the file
    const fileBuffer = await storage.download(storagePath);

    // Determine content type based on extension
    const extension = storagePath.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (extension === 'wav') {
      contentType = 'audio/wav';
    } else if (extension === 'mp3') {
      contentType = 'audio/mpeg';
    } else if (extension === 'ogg') {
      contentType = 'audio/ogg';
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('File serve error:', error);
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    );
  }
}
