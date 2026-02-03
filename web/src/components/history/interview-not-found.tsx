"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Component displayed when an interview is not found.
 * Automatically redirects to home page after 3 seconds.
 */
export function InterviewNotFound() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-sky-50 via-stone-50 to-sky-50/30 font-sans text-gray-800 overflow-x-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-stone-200/40 backdrop-blur-md bg-white/60 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-sky-200 animate-pulse"></div>
            <span className="font-normal tracking-wide text-sm text-gray-700">Interview Not Found</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-4">Interview Not Found</h1>
            <p className="text-slate-600 mb-2">The interview you're looking for doesn't exist or has been deleted.</p>
            <p className="text-sm text-slate-500">Redirecting to home page in 3 seconds...</p>
            <Link
              href="/"
              className="inline-block mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Go Home Now
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
