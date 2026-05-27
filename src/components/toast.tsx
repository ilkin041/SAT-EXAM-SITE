"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
type Toast = { id: string; message: string; kind: ToastKind };

const ToastCtx = createContext<{
  show: (message: string, kind?: ToastKind) => void;
} | null>(null);

/** Lightweight toast system — no dependencies, no portals, no fanfare. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, kind: ToastKind = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, kind }]);
  }, []);

  // Auto-dismiss each toast 3.5s after it's shown.
  useEffect(() => {
    if (toasts.length === 0) return;
    const id = toasts[0].id;
    const timer = setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3500);
    return () => clearTimeout(timer);
  }, [toasts]);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "pointer-events-auto animate-in fade-in slide-in-from-bottom-2 rounded-md border px-4 py-2.5 text-sm shadow-lg",
              t.kind === "success" &&
                "border-green-500/40 bg-green-50 text-green-900 dark:bg-green-950/40 dark:text-green-200",
              t.kind === "error" &&
                "border-destructive/40 bg-destructive/10 text-destructive",
              t.kind === "info" && "border-border bg-card text-foreground",
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const c = useContext(ToastCtx);
  if (!c) {
    // Don't blow up at build time if a component renders outside the provider —
    // just log and no-op. (E.g. tests render components in isolation.)
    return (msg: string) => {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[toast outside provider] ${msg}`);
      }
    };
  }
  return c.show;
}
