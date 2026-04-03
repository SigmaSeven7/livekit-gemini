import { createFileRoute } from "@tanstack/react-router";
import { validate as uuidValidate } from "uuid";
import { InterviewPage } from "@/components/interview-session/interview-page";
import { InterviewRoomNotFound } from "@/components/interview-session/interview-room-not-found";

/** Loaders run in the browser on SPA navigation; Prisma must not be used here — call the API instead. */
function interviewExistsUrl(id: string): string {
  const path = `/api/interviews/${encodeURIComponent(id)}`;
  if (typeof window !== "undefined") {
    return path;
  }
  const origin =
    (import.meta.env.VITE_PUBLIC_APP_ORIGIN as string | undefined) ||
    "http://localhost:3000";
  return `${origin.replace(/\/$/, "")}${path}`;
}

async function getInterviewExists(id: string): Promise<boolean> {
  try {
    if (!uuidValidate(id)) {
      return false;
    }

    const res = await fetch(interviewExistsUrl(id));
    return res.ok;
  } catch (error) {
    console.error("Error fetching interview:", error);
    return false;
  }
}

export const Route = createFileRoute("/interview/$interviewId")({
  component: InterviewRoomPage,
  loader: async ({ params }) => {
    const interviewExists = await getInterviewExists(params.interviewId);
    return { interviewId: params.interviewId, interviewExists };
  },
});

function InterviewRoomPage() {
  const { interviewId, interviewExists } = Route.useLoaderData();

  if (!interviewExists) {
    return <InterviewRoomNotFound />;
  }

  return <InterviewPage roomId={interviewId} />;
}
