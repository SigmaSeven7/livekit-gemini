import { InterviewPage } from "@/components/interview-session/interview-page";
import { InterviewRoomNotFound } from "@/components/interview-session/interview-room-not-found";
import { validate as uuidValidate } from "uuid";


async function getInterview(id: string): Promise<boolean> {
  try {

    if (!uuidValidate(id)) {
      return false;
    }

    const prisma = (await import('@/lib/prisma')).default;
    
    const interview = await prisma.interview.findUnique({
      where: { id },
    });

    return interview !== null;
  } catch (error) {
    console.error('Error fetching interview:', error);
    return false;
  }
}

export default async function Page({ params }: { params: Promise<{ roomId: string }> }) {
    const { roomId } = await params;


    // Check if interview exists in database
    const interviewExists = await getInterview(roomId);
    if (!interviewExists) {
        return <InterviewRoomNotFound />;
    }

    return <InterviewPage roomId={roomId} />;
}
