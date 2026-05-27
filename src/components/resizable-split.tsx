"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  left: React.ReactNode;
  right: React.ReactNode;
  /** Initial left-pane width as a percent (0–100). */
  initialLeftPercent?: number;
  /** Lower bound for either pane, in pixels. */
  minPanePx?: number;
  /** Optional key for sessionStorage persistence of the user's split. */
  storageKey?: string;
  className?: string;
}

/**
 * Two-column split with a draggable vertical divider. Used for R&W questions
 * (passage on the left, question on the right).
 *
 * The split is stored as a percentage of the container width so the layout
 * stays balanced across screen sizes. Each child gets its own internal scroll.
 */
export function ResizableSplit({
  left,
  right,
  initialLeftPercent = 50,
  minPanePx = 280,
  storageKey,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftPct, setLeftPct] = useState(initialLeftPercent);
  const [dragging, setDragging] = useState(false);

  // Hydrate from sessionStorage on mount.
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return;
      const n = Number(raw);
      if (Number.isFinite(n) && n > 10 && n < 90) setLeftPct(n);
    } catch {
      /* ignore */
    }
  }, [storageKey]);

  // Persist on change (debounced via rAF).
  const rafRef = useRef<number | null>(null);
  useEffect(() => {
    if (!storageKey) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      try {
        sessionStorage.setItem(storageKey, String(leftPct));
      } catch {
        /* ignore */
      }
    });
  }, [leftPct, storageKey]);

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(true);

      function onMove(ev: MouseEvent) {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = ev.clientX - rect.left;
        const width = rect.width;
        if (width <= 0) return;
        // Clamp so neither pane goes below minPanePx.
        const minLeft = (minPanePx / width) * 100;
        const maxLeft = 100 - (minPanePx / width) * 100;
        const pct = Math.max(minLeft, Math.min(maxLeft, (x / width) * 100));
        setLeftPct(pct);
      }
      function onUp() {
        setDragging(false);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [minPanePx],
  );

  // Double-click → reset to 50/50.
  const reset = useCallback(() => setLeftPct(50), []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex min-h-0 flex-1 overflow-hidden",
        dragging && "select-none",
        className,
      )}
    >
      <div
        className="overflow-y-auto"
        style={{ width: `${leftPct}%` }}
      >
        {left}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={startDrag}
        onDoubleClick={reset}
        title="Drag to resize · double-click to reset"
        className={cn(
          "group relative w-1 shrink-0 cursor-col-resize bg-neutral-300 transition-colors",
          dragging ? "bg-blue-600" : "hover:bg-neutral-400",
        )}
      >
        {/* Wider invisible hit area so the handle is easy to grab. */}
        <span className="absolute inset-y-0 -left-1.5 -right-1.5" />
        {/* Visible grip indicator */}
        <span
          className={cn(
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-neutral-400 transition-colors",
            "h-10 w-1",
            dragging ? "bg-blue-700" : "group-hover:bg-neutral-600",
          )}
        />
      </div>
      <div
        className="overflow-y-auto"
        style={{ width: `${100 - leftPct}%` }}
      >
        {right}
      </div>
    </div>
  );
}
