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

    if (!message || !message.transcript) {
      return NextResponse.json(
        { error: 'Message with transcript is required' },
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
      // Message already exists, skip storing
      return NextResponse.json({
        success: true,
        duplicate: true,
        messageCount: JSON.parse(interview.transcript).length,
      });
    }

    // Parse existing messages and append new one
    const existingMessages: ConversationMessage[] = JSON.parse(interview.transcript);
    const updatedMessages = [...existingMessages, message];

    // Use transaction to atomically create hash and update transcript
    await prisma.$transaction([
      prisma.messageHash.create({
        data: {
          interviewId: id,
          contentHash,
        },
      }),
      prisma.interview.update({
        where: { id },
        data: {
          transcript: JSON.stringify(updatedMessages),
        },
      }),
    ]);

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
