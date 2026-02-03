import { Metadata } from "next";
import { SetupForm } from "@/components/interview-setup/setup-form";
import Link from "next/link";

import Heart from "@/assets/heart.svg";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { History } from "lucide-react";

export const metadata: Metadata = {
  title: "AI Interviewer | Gemini Live",
  description: "Advanced AI Interviewer built on Gemini Live API and LiveKit.",
};

export default function Page() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-sky-50 via-stone-50 to-sky-50/30 font-sans text-gray-800 overflow-x-hidden">
      {/* Friendly Header */}
      <header className="flex items-center justify-between px-8 py-6 border-b border-stone-200/40 backdrop-blur-md bg-white/60 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-sky-200 animate-pulse"></div>
          <span className="font-normal tracking-wide text-sm text-gray-700">✨ AI Interview Practice</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/history"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors"
          >
            <History className="w-4 h-4" />
            <span>Interview History</span>
          </Link>
          <span className="text-xs font-light text-gray-500">v1.0.0</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
      <SetupForm />
      </main>

      {/* Friendly Footer */}
      <footer className="py-8 border-t border-stone-200/40 text-center text-xs text-gray-500 font-light">
        <div className="flex items-center justify-center gap-2 mb-3">
          <span>Made with</span>
          <Heart className="w-3 h-3 text-red-400" />
          <span>using</span>
          <a 
            href="https://livekit.io" 
            className="text-gray-600 hover:text-gray-800 transition-colors"
          >
            LiveKit Agents
          </a>
        </div>
        <a
          href="https://github.com/livekit-examples/gemini-playground"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <GitHubLogoIcon className="w-3.5 h-3.5" />
          <span>View Source</span>
        </a>
      </footer>
    </div>
  );
}
