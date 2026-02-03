import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { InterviewStatus } from '@/types/conversation';
import { validate as uuidValidate } from 'uuid';

/**
 * GET /api/history?id=<interviewId> - Get a specific interview by ID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Interview ID is required' },
        { status: 400 }
      );
    }

    if (!uuidValidate(id)) {
      return NextResponse.json(
        { error: 'Invalid interview ID format' },
        { status: 400 }
      );
    }

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
      createdAt: interview.createdAt.toISOString(),
      updatedAt: interview.updatedAt.toISOString(),
      status: interview.status as InterviewStatus,
      config: interview.config ? JSON.parse(interview.config) : null,
      transcript: JSON.parse(interview.transcript),
    });
  } catch (error) {
    console.error('Get interview error:', error);
    return NextResponse.json(
      { error: 'Failed to get interview' },
      { status: 500 }
    );
  }
}
