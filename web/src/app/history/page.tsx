"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import { InterviewCard } from "@/components/history/interview-card";
import { InterviewStatus } from "@/types/conversation";

interface InterviewListItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: InterviewStatus;
  config: Record<string, unknown> | null;
  messageCount: number;
  transcript: any[];
}

export default function HistoryPage() {
  const [interviews, setInterviews] = useState<InterviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | 'all' | null>(null);

  const fetchInterviews = async () => {
    try {
      const response = await fetch('/api/interviews');
      if (!response.ok) {
        throw new Error('Failed to fetch interviews');
      }
      const data = await response.json();
      setInterviews(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load interviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  const handleDeleteAll = async () => {
    if (!confirm(`Are you sure you want to delete all ${interviews.length} interviews? This action cannot be undone.`)) {
      return;
    }

    setDeleting('all');
    try {
      const response = await fetch('/api/interviews?confirm=true', {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete all interviews');
      }
      
      await fetchInterviews();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete all interviews');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteInterview = async (id: string) => {
    if (!confirm('Are you sure you want to delete this interview? This action cannot be undone.')) {
      return;
    }

    setDeleting(id);
    try {
      const response = await fetch(`/api/interviews/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete interview');
      }
      
      await fetchInterviews();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete interview');
    } finally {
      setDeleting(null);
    }
  };

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
            <span className="font-normal tracking-wide text-sm text-gray-700">Interview History</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-slate-500">Loading interviews...</div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">
              <p className="font-semibold mb-1">Error loading interviews</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : interviews.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-12 text-center">
              <p className="text-slate-600 mb-2">No interviews found</p>
              <p className="text-sm text-slate-500">Start your first interview to see it here</p>
              <Link
                href="/"
                className="inline-block mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Start Interview
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 mb-2">Your Interviews</h1>
                  <p className="text-sm text-slate-600">{interviews.length} {interviews.length === 1 ? 'interview' : 'interviews'}</p>
                </div>
                <button
                  onClick={handleDeleteAll}
                  disabled={deleting === 'all'}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting === 'all' ? 'Deleting...' : 'Delete All'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {interviews.map((interview) => (
                  <InterviewCard
                    key={interview.id}
                    id={interview.id}
                    status={interview.status}
                    createdAt={interview.createdAt}
                    messageCount={interview.messageCount}
                    config={interview.config}
                    onDelete={handleDeleteInterview}
                    isDeleting={deleting === interview.id}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
