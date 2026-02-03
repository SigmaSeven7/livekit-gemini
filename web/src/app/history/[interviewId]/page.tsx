import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { InterviewDetail } from "@/components/history/interview-detail";

interface PageProps {
  params: Promise<{ interviewId: string }>;
}

async function getInterview(id: string) {
  try {
    // For server-side fetch, we need to use the full URL or make it a client component
    // Since we want server-side rendering, let's import prisma directly
    const prisma = (await import('@/lib/prisma')).default;
    
    const interview = await prisma.interview.findUnique({
      where: { id },
    });

    if (!interview) {
      return null;
    }

    return {
      id: interview.id,
      createdAt: interview.createdAt.toISOString(),
      updatedAt: interview.updatedAt.toISOString(),
      status: interview.status,
      config: interview.config ? JSON.parse(interview.config) : null,
      messages: JSON.parse(interview.transcript),
    };
  } catch (error) {
    console.error('Error fetching interview:', error);
    return null;
  }
}

export default async function InterviewDetailPage({ params }: PageProps) {
  const { interviewId } = await params;
  const interview = await getInterview(interviewId);

  if (!interview) {
    notFound();
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-sky-50 via-stone-50 to-sky-50/30 font-sans text-gray-800 overflow-x-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-stone-200/40 backdrop-blur-md bg-white/60 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link
            href="/history"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-sky-200 animate-pulse"></div>
            <span className="font-normal tracking-wide text-sm text-gray-700">Interview Details</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <InterviewDetail interview={interview} />
        </div>
      </main>
    </div>
  );
}
