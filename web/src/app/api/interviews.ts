import { createFileRoute } from "@tanstack/react-router";
import prisma from "@/lib/prisma";
import { InterviewStatus } from "@/types/conversation";

interface CreateInterviewBody {
  config?: Record<string, unknown>;
  status?: InterviewStatus;
  questions?: unknown[];
}

export const Route = createFileRoute("/api/interviews")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body: CreateInterviewBody = await request.json();

          const interview = await prisma.interview.create({
            data: {
              config: body.config ? JSON.stringify(body.config) : null,
              status: body.status || "in_progress",
              transcript: "[]",
              questions: body.questions ? JSON.stringify(body.questions) : "[]",
            },
          });

          return Response.json({
            id: interview.id,
            createdAt: interview.createdAt,
            updatedAt: interview.updatedAt,
            status: interview.status,
            config: interview.config ? JSON.parse(interview.config) : null,
            messages: [],
            questions: interview.questions ? JSON.parse(interview.questions) : [],
          });
        } catch (error) {
          console.error("Create interview error:", error);
          return Response.json(
            { error: "Failed to create interview" },
            { status: 500 },
          );
        }
      },
      GET: async ({ request }) => {
        try {
          const { searchParams } = new URL(request.url);
          const cursor = searchParams.get("cursor");

          const MAX_LIMIT = 100;
          const rawLimit = parseInt(searchParams.get("limit") || "10", 10);
          const limit = Math.min(Math.max(1, rawLimit || 10), MAX_LIMIT);

          const where = cursor
            ? {
                createdAt: {
                  lt: new Date(cursor),
                },
              }
            : undefined;

          const interviews = await prisma.interview.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: limit + 1,
          });

          const hasMore = interviews.length > limit;
          const data = hasMore ? interviews.slice(0, limit) : interviews;

          const nextCursor =
            data.length > 0
              ? data[data.length - 1].createdAt.toISOString()
              : null;

          const dataWithCount = data.map((interview) => {
            const config = interview.config ? JSON.parse(interview.config) : null;
            const transcript = JSON.parse(interview.transcript);
            const processedTranscript = interview.processedTranscript
              ? JSON.parse(interview.processedTranscript)
              : [];
            const messages =
              processedTranscript.length > 0 ? processedTranscript : transcript;
            return {
              id: interview.id,
              createdAt: interview.createdAt,
              updatedAt: interview.updatedAt,
              status: interview.status,
              config,
              messageCount: messages.length,
              transcript,
              processedTranscript,
              audioUrl: interview.audioUrl,
            };
          });

          return Response.json({
            data: dataWithCount,
            nextCursor: hasMore ? nextCursor : null,
            hasMore,
          });
        } catch (error) {
          console.error("List interviews error:", error);
          return Response.json(
            { error: "Failed to list interviews" },
            { status: 500 },
          );
        }
      },
      DELETE: async ({ request }) => {
        try {
          const { searchParams } = new URL(request.url);

          const confirm = searchParams.get("confirm");
          if (confirm !== "true") {
            return Response.json(
              {
                error:
                  "Deletion requires confirmation. Add ?confirm=true to proceed.",
                message:
                  "This will delete all interviews. Use ?confirm=true&status=<status> to filter by status.",
              },
              { status: 400 },
            );
          }

          const status = searchParams.get("status") as InterviewStatus | null;
          const where = status ? { status } : undefined;

          const countBefore = await prisma.interview.count({ where });

          if (countBefore === 0) {
            return Response.json({
              success: true,
              deleted: 0,
              message: "No interviews found to delete",
            });
          }

          const result = await prisma.interview.deleteMany({
            where,
          });

          return Response.json({
            success: true,
            deleted: result.count,
            message: status
              ? `Deleted ${result.count} interview(s) with status "${status}"`
              : `Deleted all ${result.count} interview(s)`,
          });
        } catch (error) {
          console.error("Delete all interviews error:", error);
          return Response.json(
            { error: "Failed to delete interviews" },
            { status: 500 },
          );
        }
      },
    },
  },
});
