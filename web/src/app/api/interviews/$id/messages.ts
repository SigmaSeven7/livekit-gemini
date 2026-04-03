import { createFileRoute } from "@tanstack/react-router";
import prisma from "@/lib/prisma";
import { ConversationMessage } from "@/types/conversation";
import { generateContentHash } from "@/lib/content-hash";

interface AppendMessageBody {
  message: ConversationMessage;
}

export const Route = createFileRoute("/api/interviews/$id/messages")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        try {
          const { id } = params;
          const body: AppendMessageBody = await request.json();
          const { message } = body;

          if (!message) {
            return Response.json(
              { error: "Message is required" },
              { status: 400 },
            );
          }

          if (!message.transcript || typeof message.transcript !== "string") {
            return Response.json(
              { error: "Valid transcript string is required" },
              { status: 400 },
            );
          }

          if (!message.transcriptId || typeof message.transcriptId !== "string") {
            return Response.json(
              { error: "Valid transcriptId is required" },
              { status: 400 },
            );
          }

          if (
            !message.participant ||
            !["user", "agent"].includes(message.participant)
          ) {
            return Response.json(
              { error: "Valid participant (user/agent) is required" },
              { status: 400 },
            );
          }

          const interview = await prisma.interview.findUnique({
            where: { id },
          });

          if (!interview) {
            return Response.json(
              { error: "Interview not found" },
              { status: 404 },
            );
          }

          const existingMessages: ConversationMessage[] = JSON.parse(
            interview.transcript,
          );
          const existingMessageIndex = existingMessages.findIndex(
            (m) => m.transcriptId === message.transcriptId,
          );

          let updatedMessages: ConversationMessage[];

          if (existingMessageIndex !== -1) {
            updatedMessages = [...existingMessages];
            updatedMessages[existingMessageIndex] = message;

            console.log(`Updating existing message ${message.transcriptId}`);
          } else {
            updatedMessages = [...existingMessages, message];
            console.log(`Appending new message ${message.transcriptId}`);

            const contentHash = generateContentHash(id, message.transcript);

            const existingHash = await prisma.messageHash.findUnique({
              where: {
                interviewId_contentHash: {
                  interviewId: id,
                  contentHash,
                },
              },
            });

            if (existingHash) {
              return Response.json({
                success: true,
                duplicate: true,
                messageCount: existingMessages.length,
              });
            }

            await prisma.messageHash.create({
              data: {
                interviewId: id,
                contentHash,
              },
            });
          }

          await prisma.interview.update({
            where: { id },
            data: {
              transcript: JSON.stringify(updatedMessages),
            },
          });

          return Response.json({
            success: true,
            duplicate: false,
            messageCount: updatedMessages.length,
          });
        } catch (error) {
          console.error("Append message error:", error);
          return Response.json(
            { error: "Failed to append message" },
            { status: 500 },
          );
        }
      },
    },
  },
});
