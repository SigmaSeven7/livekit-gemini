import { createFileRoute, Link } from "@tanstack/react-router";
import { SetupForm } from "@/components/interview-setup/setup-form";
import { LocaleSwitcher } from "@/components/locale-switcher";
import {
  home_history_link,
  home_interview_practice,
} from "@/paraglide/messages";

import { History } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-sky-100 via-sky-50/95 to-blue-50 font-sans text-gray-800 overflow-x-hidden">
      <header className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-x-2 gap-y-3 border-b border-sky-200/50 bg-white/70 px-3 py-3 backdrop-blur-md sm:gap-x-4 sm:px-6 sm:py-4 md:px-8 md:py-6">
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2 sm:justify-start sm:gap-3">
          <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-sky-200 animate-pulse sm:h-3 sm:w-3" />
          <span className="truncate text-xs font-normal tracking-wide text-gray-700 sm:text-sm">
            ✨ {String(home_interview_practice())}
          </span>
        </div>
        <div className="flex w-full shrink-0 items-center justify-center gap-2 sm:w-auto sm:justify-start sm:gap-3 md:gap-4">
          <LocaleSwitcher />
          <Link
            to="/history"
            aria-label={String(home_history_link())}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-2.5 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-indigo-700 sm:gap-2 sm:px-4 sm:py-2 sm:text-xs"
          >
            <History className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{String(home_history_link())}</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start px-4 py-8">
        <SetupForm />
      </main>
    </div>
  );
}
