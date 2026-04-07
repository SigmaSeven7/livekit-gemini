import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Trash2, Loader2, CheckSquare, Square } from "lucide-react";
import { InterviewCard } from "@/components/history/interview-card";
import { LocaleSwitcher } from "@/components/locale-switcher";
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
import { useToast } from "@/hooks/use-toast";
import { deleteAllInterviews, deleteInterview } from "@/lib/api/interviews";
import {
  history_cancel,
  history_delete,
  history_delete_all,
  history_delete_dialog_all_body,
  history_delete_dialog_all_title,
  history_delete_dialog_selected_body,
  history_delete_dialog_selected_title,
  history_delete_dialog_single_body,
  history_delete_dialog_single_title,
  history_delete_selected,
  history_deselect_all,
  history_empty,
  history_empty_hint,
  history_error_body,
  history_error_title,
  history_interview_one,
  history_interviews_other,
  history_load_more,
  history_loading,
  history_loading_more,
  history_page_title,
  history_select_all,
  history_selected,
  history_your_interviews,
  home_start_interview,
} from "@/paraglide/messages";

export const Route = createFileRoute("/history/")({
  component: HistoryPage,
});

function HistoryPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInterviews();
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [interviewToDelete, setInterviewToDelete] = useState<string | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const interviews = data?.pages.flatMap((page) => page.data) ?? [];

  const handleSelect = (id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === interviews.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(interviews.map((i) => i.id)));
    }
  };

  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/interviews?confirm=true", {
        method: "DELETE",
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.error || "Failed to delete all interviews");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      setShowDeleteAllDialog(false);
      setSelectedIds(new Set());
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: String(history_error_title()),
        description: err.message || String(history_error_body()),
      });
    },
  });

  const deleteSelectedMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results = await Promise.allSettled(
        ids.map((id) => deleteInterview(id)),
      );
      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        throw new Error(`Failed to delete ${failed.length} interview(s)`);
      }
      return ids;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      setSelectedIds(new Set());
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: String(history_error_title()),
        description: err.message || String(history_error_body()),
      });
    },
  });

  const deleteInterviewMutation = useMutation({
    mutationFn: (id: string) => deleteInterview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interviews"] });
      setInterviewToDelete(null);
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(interviewToDelete || "");
        return newSet;
      });
    },
    onError: (err: Error) => {
      toast({
        variant: "destructive",
        title: String(history_error_title()),
        description: err.message || String(history_error_body()),
      });
    },
  });

  const handleDeleteAll = () => {
    deleteAllMutation.mutate();
  };

  const handleDeleteSelected = () => {
    deleteSelectedMutation.mutate(Array.from(selectedIds));
  };

  const handleDeleteInterview = (id: string) => {
    deleteInterviewMutation.mutate(id);
  };

  const isAllSelected =
    interviews.length > 0 && selectedIds.size === interviews.length;
  const isSomeSelected = selectedIds.size > 0;

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-sky-100 via-sky-50/95 to-blue-50 font-sans text-gray-800 overflow-x-hidden">
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
              {String(history_page_title())}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LocaleSwitcher />
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-gray-500">{String(history_loading())}</div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">
              <p className="font-semibold mb-1">{String(history_error_title())}</p>
              <p className="text-sm">
                {error.message || String(history_error_body())}
              </p>
            </div>
          ) : interviews.length === 0 ? (
            <div className="bg-white/90 border border-sky-200/50 rounded-2xl p-12 text-center shadow-sm">
              <p className="text-gray-600 mb-2">{String(history_empty())}</p>
              <p className="text-sm text-gray-500">
                {String(history_empty_hint())}
              </p>
              <Link
                to="/"
                className="inline-block mt-4 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
              >
                {String(home_start_interview())}
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {String(history_your_interviews())}
                  </h1>
                  <p className="text-sm text-gray-600">
                    {interviews.length}{" "}
                    {interviews.length === 1
                      ? String(history_interview_one())
                      : String(history_interviews_other())}
                    {isSomeSelected && (
                      <span className="ml-2 text-indigo-600">
                        {String(history_selected({ count: selectedIds.size }))}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="flex items-center gap-2 px-4 py-2 border border-sky-200/80 bg-white/60 hover:bg-sky-50/90 text-gray-700 rounded-xl text-sm font-medium transition-colors"
                  >
                    {isAllSelected ? (
                      <Square className="w-4 h-4" />
                    ) : (
                      <CheckSquare className="w-4 h-4" />
                    )}
                    {isAllSelected
                      ? String(history_deselect_all())
                      : String(history_select_all())}
                  </button>

                  {isSomeSelected && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteAllDialog(true)}
                      disabled={deleteSelectedMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                      {deleteSelectedMutation.isPending ? (
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      {String(history_delete_selected())}
                    </button>
                  )}

                  {!isSomeSelected && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteAllDialog(true)}
                      disabled={deleteAllMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl text-sm font-medium transition-colors"
                    >
                      {deleteAllMutation.isPending ? (
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      {String(history_delete_all())}
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {interviews.map((interview) => (
                  <InterviewCard
                    key={interview.id}
                    id={interview.id}
                    status={interview.status}
                    createdAt={interview.createdAt}
                    messageCount={
                      interview.messageCount ?? interview.transcript.length
                    }
                    config={interview.config}
                    onDelete={(id) => setInterviewToDelete(id)}
                    isDeleting={
                      deleteInterviewMutation.isPending &&
                      deleteInterviewMutation.variables === interview.id
                    }
                    isSelected={selectedIds.has(interview.id)}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
              {hasNextPage && (
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm font-medium transition-colors"
                  >
                    {isFetchingNextPage
                      ? String(history_loading_more())
                      : String(history_load_more())}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      <AlertDialog
        open={showDeleteAllDialog}
        onOpenChange={setShowDeleteAllDialog}
      >
        <AlertDialogContent
          className="flex flex-col items-center justify-center bg-white border border-sky-200/50 rounded-2xl shadow-xl"
          overlayClassName="bg-black/20 backdrop-blur-sm"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">
              {isSomeSelected
                ? String(history_delete_dialog_selected_title())
                : String(history_delete_dialog_all_title())}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              {isSomeSelected
                ? String(
                    history_delete_dialog_selected_body({
                      count: selectedIds.size,
                    }),
                  )
                : String(
                    history_delete_dialog_all_body({ count: interviews.length }),
                  )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl border-sky-200 text-gray-700 hover:bg-sky-50">
              {String(history_cancel())}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={isSomeSelected ? handleDeleteSelected : handleDeleteAll}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              {String(history_delete())}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={interviewToDelete !== null}
        onOpenChange={(open) => !open && setInterviewToDelete(null)}
      >
        <AlertDialogContent
          className="bg-white border border-sky-200/50 rounded-2xl shadow-xl"
          overlayClassName="bg-black/20 backdrop-blur-sm"
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900">
              {String(history_delete_dialog_single_title())}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600">
              {String(history_delete_dialog_single_body())}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="!justify-center">
            <AlertDialogCancel className="rounded-xl border-sky-200 text-gray-700 hover:bg-sky-50">
              {String(history_cancel())}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                interviewToDelete && handleDeleteInterview(interviewToDelete)
              }
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              {String(history_delete())}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
