/**
 * Interview API Routes by ID
 * 
 * GET /api/interviews/[id] - Get a specific interview
 * PUT /api/interviews/[id] - Update an interview (save transcript)
 * DELETE /api/interviews/[id] - Delete an interview
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ConversationMessage, InterviewStatus } from '@/types/conversation';
import { processTranscriptsWithGroq, RawTranscriptSegment } from '@/lib/services/transcript-processor';

interface UpdateInterviewBody {
  status?: InterviewStatus;
  config?: Record<string, unknown>;
  messages?: ConversationMessage[];
}

const AUDIO_SERVER_URL = process.env.AUDIO_SERVER_URL || 'http://localhost:3001';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const interview = await prisma.interview.findUnique({
      where: { id },
    });

    if (!interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: interview.id,
      createdAt: interview.createdAt,
      updatedAt: interview.updatedAt,
      status: interview.status,
      config: interview.config ? JSON.parse(interview.config) : null,
      messages: JSON.parse(interview.transcript),
      processedTranscript: interview.processedTranscript ? JSON.parse(interview.processedTranscript) : [],
      audioUrl: interview.audioUrl,
    });
  } catch (error) {
    console.error('Get interview error:', error);
    return NextResponse.json(
      { error: 'Failed to get interview' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateInterviewBody = await request.json();

    // Check if interview exists
    const existing = await prisma.interview.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    // If status is being set to 'completed', fetch all data from agent, process, store, and cleanup
    if (body.status === 'completed') {
      try {
        // Step 1: Fetch all data from agent DB via /getAudioFile
        const audioServerRes = await fetch(
          `${AUDIO_SERVER_URL}/getAudioFile?id=${encodeURIComponent(id)}`
        );

        if (!audioServerRes.ok) {
          console.error('Failed to fetch from audio server:', audioServerRes.statusText);
          return NextResponse.json(
            { error: 'Failed to fetch audio data from agent server' },
            { status: 502 }
          );
        }

        const audioData = await audioServerRes.json();
        const rawTranscripts = audioData.transcripts || [];
        const audioUrl = audioData.audioUrl || null;

        // Step 2: Process transcripts with Groq
        const processedMessages = await processTranscriptsWithGroq(
          rawTranscripts as RawTranscriptSegment[]
        );

        // Step 3: Update interview with processed transcript and audio URL
        const interview = await prisma.interview.update({
          where: { id },
          data: {
            status: 'completed',
            transcript: JSON.stringify(body.messages || []),
            processedTranscript: JSON.stringify(processedMessages),
            audioUrl: audioUrl,
          },
        });

        // Step 4: Delete data from agent DB
        try {
          await fetch(`${AUDIO_SERVER_URL}/interviews/${encodeURIComponent(id)}`, {
            method: 'DELETE',
          });
        } catch (deleteError) {
          console.warn('Failed to delete transcripts from agent DB:', deleteError);
          // Don't fail the request if cleanup fails
        }

        return NextResponse.json({
          id: interview.id,
          createdAt: interview.createdAt,
          updatedAt: interview.updatedAt,
          status: interview.status,
          config: interview.config ? JSON.parse(interview.config) : null,
          transcript: JSON.parse(interview.transcript),
          processedTranscript: interview.processedTranscript ? JSON.parse(interview.processedTranscript) : [],
          audioUrl: interview.audioUrl,
        });

      } catch (processingError) {
        console.error('Error processing interview completion:', processingError);
        return NextResponse.json(
          { error: 'Failed to process interview data' },
          { status: 500 }
        );
      }
    }

    // Build update data for non-completion updates
    const updateData: {
      status?: string;
      config?: string | null;
      transcript?: string;
    } = {};

    if (body.status) {
      updateData.status = body.status;
    }

    if (body.config !== undefined) {
      updateData.config = body.config ? JSON.stringify(body.config) : null;
    }

    if (body.messages !== undefined) {
      updateData.transcript = JSON.stringify(body.messages);
    }

    const interview = await prisma.interview.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      id: interview.id,
      createdAt: interview.createdAt,
      updatedAt: interview.updatedAt,
      status: interview.status,
      config: interview.config ? JSON.parse(interview.config) : null,
      messages: JSON.parse(interview.transcript),
    });
  } catch (error) {
    console.error('Update interview error:', error);
    return NextResponse.json(
      { error: 'Failed to update interview' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if interview exists
    const existing = await prisma.interview.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    await prisma.interview.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete interview error:', error);
    return NextResponse.json(
      { error: 'Failed to delete interview' },
      { status: 500 }
    );
  }
}
