import { InterviewPage } from "@/components/interview-session/interview-page";

export default async function Page({ params }: { params: Promise<{ roomId: string }> }) {
    const { roomId } = await params;
    return <InterviewPage roomId={roomId} />;
}
