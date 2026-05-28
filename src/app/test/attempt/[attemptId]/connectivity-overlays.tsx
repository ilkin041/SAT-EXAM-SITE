"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

/* =========================================================================
 * Connectivity & multi-tab overlays for the test interface.
 *
 * Each export is self-contained so the parent component can drop them in
 * without threading state. They share no internal state with the test
 * interface beyond a few callbacks for visibility / disable signals.
 * ========================================================================= */

/**
 * "Resuming your test…" splash. Renders for 1 second when the student lands
 * on the attempt page mid-progress (saved answers or non-zero currentIndex),
 * then unmounts.
 */
export function ResumingSplash() {
  return (
    <div
      role="status"
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-3 bg-background"
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
      <p className="text-sm font-medium text-foreground">Resuming your test…</p>
    </div>
  );
}

/**
 * Top-of-page sticky banner that switches between offline (red) and the brief
 * "Connection restored" (green) state, then auto-hides 3 seconds later.
 *
 * Parent provides `isOffline` (computed from window online/offline events in
 * `useNetworkStatus`) and renders this banner above the test TopBar so the
 * banner sits at the visual top of the page.
 */
export function ConnectivityBanner({
  isOffline,
  justReconnected,
}: {
  isOffline: boolean;
  justReconnected: boolean;
}) {
  if (!isOffline && !justReconnected) return null;
  return (
    <div
      role="status"
      className={cn(
        "flex w-full items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white",
        isOffline ? "bg-red-600" : "bg-green-600",
      )}
    >
      {isOffline ? (
        <>
          <WifiOff className="h-4 w-4" aria-hidden />
          <span>
            No internet connection — your answers are saved and will sync when
            you reconnect
          </span>
        </>
      ) : (
        <>
          <CheckCircle2 className="h-4 w-4" aria-hidden />
          <span>Connection restored</span>
        </>
      )}
    </div>
  );
}

/**
 * Full-screen non-dismissible overlay shown in tabs OTHER than the one
 * currently being used to take the test.
 *
 * Triggered by `useTabConflictGuard` below.
 */
export function DuplicateTabOverlay() {
  return (
    <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center gap-4 bg-background/95 p-8 backdrop-blur-sm">
      <div className="rounded-full bg-amber-500/15 p-4 text-amber-600">
        <AlertTriangle className="h-10 w-10" aria-hidden />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        This test is open in another tab
      </h1>
      <p className="max-w-md text-center text-sm text-muted-foreground">
        Please close this tab and continue in the other one. Your answers are
        being saved there.
      </p>
    </div>
  );
}

/* ----------------------------- Hooks ----------------------------- */

/**
 * Listens for `online` / `offline` events on the window and surfaces:
 *  - `isOffline`: currently disconnected
 *  - `justReconnected`: true for 3 seconds after coming back online
 *
 * Also runs a silent 5-second background ping when offline to detect
 * recovery on browsers that don't fire `online` reliably (some captive
 * portals / VPN drops).
 */
export function useNetworkStatus(): {
  isOffline: boolean;
  justReconnected: boolean;
} {
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator === "undefined" ? false : !navigator.onLine,
  );
  const [justReconnected, setJustReconnected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function goOffline() {
      setIsOffline(true);
      setJustReconnected(false);
    }
    function goOnline() {
      setIsOffline(false);
      setJustReconnected(true);
      // Auto-hide the green confirmation after 3 seconds per spec.
      setTimeout(() => setJustReconnected(false), 3000);
    }

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);

    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  // Silent recovery poll: when offline, every 5 s do a tiny HEAD against
  // the API. If it succeeds we know we're back even if `online` never fired.
  useEffect(() => {
    if (!isOffline) return;
    const id = setInterval(async () => {
      try {
        const res = await fetch("/api/auth/session", {
          method: "HEAD",
          cache: "no-store",
        });
        if (res.ok || res.status === 401) {
          // Treat any successful round-trip as "we're online".
          setIsOffline(false);
          setJustReconnected(true);
          setTimeout(() => setJustReconnected(false), 3000);
        }
      } catch {
        /* still offline */
      }
    }, 5000);
    return () => clearInterval(id);
  }, [isOffline]);

  return { isOffline, justReconnected };
}

/**
 * Registers a BroadcastChannel for this attempt. If another tab opens the
 * same attempt, all OTHER open tabs receive a message and surface the
 * duplicate-tab overlay. The newest tab is the "active" one; older tabs
 * lock themselves down.
 *
 * Returns `isDuplicate: true` for any tab that has been notified that
 * another tab took over.
 */
export function useTabConflictGuard(attemptId: string): boolean {
  const [isDuplicate, setIsDuplicate] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
      return;
    }
    const channel = new BroadcastChannel(`attempt-${attemptId}`);

    // Announce that this tab is now active. Any other tab listening will see
    // the message and disable itself.
    channel.postMessage({ kind: "open", at: Date.now() });

    channel.onmessage = (event) => {
      const data = event.data as { kind?: string };
      if (data?.kind === "open") {
        // Another tab just announced itself → this tab is now stale.
        setIsDuplicate(true);
      }
    };

    return () => {
      channel.close();
    };
  }, [attemptId]);

  return isDuplicate;
}
