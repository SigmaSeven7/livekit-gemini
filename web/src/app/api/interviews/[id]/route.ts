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

interface UpdateInterviewBody {
  status?: InterviewStatus;
  config?: Record<string, unknown>;
  messages?: ConversationMessage[];
}

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

    // Build update data
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
