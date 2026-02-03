/**
 * Interview API Routes
 * 
 * POST /api/interviews - Create a new interview
 * GET /api/interviews - List all interviews (optional, for admin)
 * DELETE /api/interviews - Delete all interviews (requires confirm=true)
 *   Query params:
 *     - confirm: must be "true" to proceed with deletion
 *     - status: optional filter by status before deletion
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { InterviewStatus } from '@/types/conversation';

interface CreateInterviewBody {
  config?: Record<string, unknown>;
  status?: InterviewStatus;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateInterviewBody = await request.json();
    
    const interview = await prisma.interview.create({
      data: {
        config: body.config ? JSON.stringify(body.config) : null,
        status: body.status || 'in_progress',
        transcript: '[]',
      },
    });

    return NextResponse.json({
      id: interview.id,
      createdAt: interview.createdAt,
      updatedAt: interview.updatedAt,
      status: interview.status,
      config: interview.config ? JSON.parse(interview.config) : null,
      messages: [],
    });
  } catch (error) {
    console.error('Create interview error:', error);
    return NextResponse.json(
      { error: 'Failed to create interview' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const interviews = await prisma.interview.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(
      interviews.map((interview) => ({
        id: interview.id,
        createdAt: interview.createdAt,
        updatedAt: interview.updatedAt,
        status: interview.status,
        config: interview.config ? JSON.parse(interview.config) : null,
        messageCount: JSON.parse(interview.transcript).length,
        transcript: JSON.parse(interview.transcript),
      }))
    );
  } catch (error) {
    console.error('List interviews error:', error);
    return NextResponse.json(
      { error: 'Failed to list interviews' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Require explicit confirmation to prevent accidental deletion
    const confirm = searchParams.get('confirm');
    if (confirm !== 'true') {
      return NextResponse.json(
        { 
          error: 'Deletion requires confirmation. Add ?confirm=true to proceed.',
          message: 'This will delete all interviews. Use ?confirm=true&status=<status> to filter by status.'
        },
        { status: 400 }
      );
    }

    // Optional status filter
    const status = searchParams.get('status') as InterviewStatus | null;
    const where = status ? { status } : undefined;

    // Get count before deletion for response
    const countBefore = await prisma.interview.count({ where });

    if (countBefore === 0) {
      return NextResponse.json({
        success: true,
        deleted: 0,
        message: 'No interviews found to delete',
      });
    }

    // Perform deletion
    const result = await prisma.interview.deleteMany({
      where,
    });

    return NextResponse.json({
      success: true,
      deleted: result.count,
      message: status 
        ? `Deleted ${result.count} interview(s) with status "${status}"`
        : `Deleted all ${result.count} interview(s)`,
    });
  } catch (error) {
    console.error('Delete all interviews error:', error);
    return NextResponse.json(
      { error: 'Failed to delete interviews' },
      { status: 500 }
    );
  }
}
