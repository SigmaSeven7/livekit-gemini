"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Trash2, Loader2 } from "lucide-react";
import { InterviewCard } from "@/components/history/interview-card";
import { useInterviews } from "@/hooks/use-interviews";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function HistoryPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useInterviews();
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState<string | null>(null);

  // Flatten paginated results
  const interviews = data?.pages.flatMap(page => page.data) ?? [];

  // Delete all interviews mutation
  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/interviews?confirm=true', {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete all interviews');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      setShowDeleteAllDialog(false);
    },
    onError: (err: Error) => {
      alert(err.message || 'Failed to delete all interviews');
    },
  });

  // Delete single interview mutation
  const deleteInterviewMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/interviews/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete interview');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews'] });
      setInterviewToDelete(null);
    },
    onError: (err: Error) => {
      alert(err.message || 'Failed to delete interview');
    },
  });

  const handleDeleteAll = () => {
    deleteAllMutation.mutate();
  };

  const handleDeleteInterview = (id: string) => {
    deleteInterviewMutation.mutate(id);
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
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-slate-500">Loading interviews...</div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">
              <p className="font-semibold mb-1">Error loading interviews</p>
              <p className="text-sm">{error.message || 'Failed to load interviews'}</p>
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
                  onClick={() => setShowDeleteAllDialog(true)}
                  disabled={deleteAllMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {deleteAllMutation.isPending ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {deleteAllMutation.isPending ? 'Deleting...' : 'Delete All'}
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {interviews.map((interview) => (
                  <InterviewCard
                    key={interview.id}
                    id={interview.id}
                    status={interview.status}
                    createdAt={interview.createdAt}
                    messageCount={interview.transcript.length}
                    config={interview.config}
                    onDelete={(id) => setInterviewToDelete(id)}
                    isDeleting={deleteInterviewMutation.isPending && deleteInterviewMutation.variables === interview.id}
                  />
                ))}
              </div>
              {hasNextPage && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    {isFetchingNextPage ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Delete All Confirmation Dialog */}
      <AlertDialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <AlertDialogContent 
          className="bg-white border border-slate-100 rounded-2xl shadow-xl"
          overlayClassName="bg-black/20 backdrop-blur-sm"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">Delete All Interviews?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Are you sure you want to delete all {interviews.length} {interviews.length === 1 ? 'interview' : 'interviews'}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Single Interview Confirmation Dialog */}
      <AlertDialog open={interviewToDelete !== null} onOpenChange={(open) => !open && setInterviewToDelete(null)}>
        <AlertDialogContent 
          className="bg-white border border-slate-100 rounded-2xl shadow-xl"
          overlayClassName="bg-black/20 backdrop-blur-sm"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">Delete Interview?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              Are you sure you want to delete this interview? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => interviewToDelete && handleDeleteInterview(interviewToDelete)}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
