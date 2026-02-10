/**
 * Interview Messages API Routes
 * 
 * POST /api/interviews/[id]/messages - Append a message with deduplication
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ConversationMessage } from '@/types/conversation';
import { generateContentHash } from '@/lib/content-hash';

interface AppendMessageBody {
  message: ConversationMessage;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: AppendMessageBody = await request.json();
    const { message } = body;

    // Comprehensive message validation
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    if (!message.transcript || typeof message.transcript !== 'string') {
      return NextResponse.json(
        { error: 'Valid transcript string is required' },
        { status: 400 }
      );
    }

    if (!message.transcriptId || typeof message.transcriptId !== 'string') {
      return NextResponse.json(
        { error: 'Valid transcriptId is required' },
        { status: 400 }
      );
    }

    if (!message.participant || !['user', 'agent'].includes(message.participant)) {
      return NextResponse.json(
        { error: 'Valid participant (user/agent) is required' },
        { status: 400 }
      );
    }

    // Check if interview exists
    const interview = await prisma.interview.findUnique({
      where: { id },
    });

    if (!interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    // Check if message with this transcriptId already exists in the transcript
    const existingMessages: ConversationMessage[] = JSON.parse(interview.transcript);
    const existingMessageIndex = existingMessages.findIndex(m => m.transcriptId === message.transcriptId);

    let updatedMessages: ConversationMessage[];

    if (existingMessageIndex !== -1) {
      // Update existing message
      updatedMessages = [...existingMessages];
      updatedMessages[existingMessageIndex] = {
        ...updatedMessages[existingMessageIndex],
        transcript: message.transcript,
        timestampEnd: message.timestampEnd, // Update timestampEnd as well
        // We preserve other fields like audioUrl/audioBase64 from the existing message if not provided in the update
        // But here we assume the client sends the authoritative state for these fields if they are handling audio
      };
      // If the incoming message has audio info, update it. If not, maybe keep existing?
      // For now, let's assume the client sends the full object or we merge carefully.
      // Actually, the client sends the full object.
      updatedMessages[existingMessageIndex] = message;

      console.log(`Updating existing message ${message.transcriptId}`);
    } else {
      // Append new message
      updatedMessages = [...existingMessages, message];
      console.log(`Appending new message ${message.transcriptId}`);

      // Only check for content hash duplication if it's a NEW message
      // Generate content hash for deduplication
      const contentHash = generateContentHash(id, message.transcript);

      // Check if this message hash already exists for this interview
      const existingHash = await prisma.messageHash.findUnique({
        where: {
          interviewId_contentHash: {
            interviewId: id,
            contentHash,
          },
        },
      });

      if (existingHash) {
        // Message content already exists (duplicate), skip storing
        return NextResponse.json({
          success: true,
          duplicate: true,
          messageCount: existingMessages.length,
        });
      }

      // Create hash for the new message
      await prisma.messageHash.create({
        data: {
          interviewId: id,
          contentHash,
        },
      });
    }

    // Update the interview transcript
    await prisma.interview.update({
      where: { id },
      data: {
        transcript: JSON.stringify(updatedMessages),
      },
    });

    return NextResponse.json({
      success: true,
      duplicate: false,
      messageCount: updatedMessages.length,
    });
  } catch (error) {
    console.error('Append message error:', error);
    return NextResponse.json(
      { error: 'Failed to append message' },
      { status: 500 }
    );
  }
}
