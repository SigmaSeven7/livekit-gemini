import { createFileRoute, Link } from "@tanstack/react-router";
import { SetupForm } from "@/components/interview-setup/setup-form";

import { History } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-sky-100 via-sky-50/95 to-blue-50 font-sans text-gray-800 overflow-x-hidden">
      <header className="flex items-center justify-between px-8 py-6 border-b border-sky-200/50 backdrop-blur-md bg-white/70 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-sky-200 animate-pulse"></div>
          <span className="font-normal tracking-wide text-sm text-gray-700">
            ✨ AI Interview Practice
          </span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            to="/history"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors"
          >
            <History className="w-4 h-4" />
            <span>Interview History</span>
          </Link>
          <span className="text-xs font-light text-gray-500">v1.0.0</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start px-4 py-8">
        <SetupForm />
      </main>
    </div>
  );
}
