"use client";

import { useEffect } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import {
  interview_go_home,
  interview_not_found_body,
  interview_not_found_header,
  interview_not_found_redirect,
  interview_not_found_title,
} from "@/paraglide/messages";

/**
 * Component displayed when an interview is not found.
 * Automatically redirects to home page after 3 seconds.
 */
export function InterviewNotFound() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate({ to: "/" });
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-sky-100 via-sky-50/95 to-blue-50 font-sans text-gray-800 overflow-x-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-sky-200/50 backdrop-blur-md bg-white/70 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 hover:bg-sky-50/90 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-sky-200 animate-pulse"></div>
            <span className="font-normal tracking-wide text-sm text-gray-700">
              {String(interview_not_found_header())}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/90 border border-sky-200/50 rounded-2xl p-12 text-center shadow-sm">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {String(interview_not_found_title())}
            </h1>
            <p className="text-gray-600 mb-2">{String(interview_not_found_body())}</p>
            <p className="text-sm text-gray-500">
              {String(interview_not_found_redirect())}
            </p>
            <Link
              to="/"
              className="inline-block mt-6 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
            >
              {String(interview_go_home())}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
