"use client";

import { AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description: string;
  actionLabel?: string;
}

export function ErrorDialog({
  open,
  onOpenChange,
  title = "Something went wrong",
  description,
  actionLabel = "OK",
}: ErrorDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="bg-white border border-slate-100 rounded-2xl shadow-xl max-w-md"
        overlayClassName="bg-black/20 backdrop-blur-sm"
      >
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <AlertDialogTitle className="text-slate-900">{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-slate-600 mt-2">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogAction
            onClick={() => onOpenChange(false)}
            className="w-full mx-auto bg-slate-900 hover:bg-slate-800 text-white rounded-xl !px-6 !py-2"
          >
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
