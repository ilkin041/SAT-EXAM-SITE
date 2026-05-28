"use client";

import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Small status pill next to the student name in the test BottomBar.
 *
 *  - `idle`: hidden
 *  - `saving`: spinner + "Saving" (rare to see; debounced save is fast)
 *  - `saved`: green check + "Saved" — caller wipes back to idle after 1.5s
 *  - `error`: red alert + "Save failed" — caller leaves visible until next
 *    successful save
 */
export function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-opacity duration-300",
        status === "saving" && "bg-neutral-100 text-neutral-600",
        status === "saved" &&
          "animate-fade-in bg-green-50 text-green-700",
        status === "error" && "bg-red-50 text-red-700",
      )}
    >
      {status === "saving" && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          Saving
        </>
      )}
      {status === "saved" && (
        <>
          <Check className="h-3 w-3" aria-hidden />
          Saved
        </>
      )}
      {status === "error" && (
        <>
          <AlertTriangle className="h-3 w-3" aria-hidden />
          Save failed
        </>
      )}
    </span>
  );
}
