"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Minimal type for the global Desmos namespace exposed by the API script.
declare global {
  interface Window {
    Desmos?: {
      GraphingCalculator: (
        el: HTMLElement,
        opts?: Record<string, unknown>,
      ) => DesmosCalc;
    };
  }
}

interface DesmosCalc {
  destroy: () => void;
  resize: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const DESMOS_SRC_BASE = "https://www.desmos.com/api/v1.10/calculator.js";

let scriptPromise: Promise<void> | null = null;

function loadDesmos(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Desmos) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const apiKey =
      process.env.NEXT_PUBLIC_DESMOS_API_KEY || "dcb31709b452b1cf9dc26972add0fda6";
    const script = document.createElement("script");
    script.src = `${DESMOS_SRC_BASE}?apiKey=${apiKey}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Desmos calculator"));
    document.body.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Floating, draggable, resizable Desmos calculator. Stays mounted across
 * questions within a section so the student's graphs persist.
 *
 * Important: this component must NOT unmount when the user navigates between
 * questions in the same math section — keep it rendered at the test-interface
 * root and just toggle `open`.
 */
export function DesmosCalculator({ open, onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const calcRef = useRef<DesmosCalc | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Position + size (kept in state, so dragging/resizing re-renders).
  const [pos, setPos] = useState({ x: 80, y: 80 });
  const [size, setSize] = useState({ w: 520, h: 420 });

  // Load the Desmos script lazily the first time the panel opens.
  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    loadDesmos()
      .then(() => {
        if (!cancelled) setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, loaded]);

  // Initialize / tear down the calculator instance.
  useEffect(() => {
    if (!loaded || !containerRef.current || calcRef.current) return;
    calcRef.current = window.Desmos!.GraphingCalculator(containerRef.current, {
      keypad: true,
      settingsMenu: true,
      expressionsCollapsed: false,
    });
    return () => {
      try {
        calcRef.current?.destroy();
      } catch {
        /* ignore */
      }
      calcRef.current = null;
    };
  }, [loaded]);

  // Notify Desmos to recompute its canvas size whenever the panel resizes.
  useEffect(() => {
    if (calcRef.current) calcRef.current.resize();
  }, [size.w, size.h]);

  // ---------- Drag ----------
  const dragStartRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  function onDragStart(e: React.MouseEvent) {
    dragStartRef.current = { x: e.clientX, y: e.clientY, ox: pos.x, oy: pos.y };
    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup", onDragEnd);
  }
  function onDragMove(e: MouseEvent) {
    const s = dragStartRef.current;
    if (!s) return;
    const nx = Math.max(0, Math.min(window.innerWidth - 60, s.ox + (e.clientX - s.x)));
    const ny = Math.max(0, Math.min(window.innerHeight - 30, s.oy + (e.clientY - s.y)));
    setPos({ x: nx, y: ny });
  }
  function onDragEnd() {
    dragStartRef.current = null;
    window.removeEventListener("mousemove", onDragMove);
    window.removeEventListener("mouseup", onDragEnd);
  }

  // ---------- Resize ----------
  const resizeStartRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  function onResizeStart(e: React.MouseEvent) {
    e.stopPropagation();
    resizeStartRef.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h };
    window.addEventListener("mousemove", onResizeMove);
    window.addEventListener("mouseup", onResizeEnd);
  }
  function onResizeMove(e: MouseEvent) {
    const s = resizeStartRef.current;
    if (!s) return;
    const nw = Math.max(320, s.w + (e.clientX - s.x));
    const nh = Math.max(260, s.h + (e.clientY - s.y));
    setSize({ w: nw, h: nh });
  }
  function onResizeEnd() {
    resizeStartRef.current = null;
    window.removeEventListener("mousemove", onResizeMove);
    window.removeEventListener("mouseup", onResizeEnd);
  }

  return (
    <div
      className={cn(
        "fixed z-50 select-none rounded-lg border border-neutral-300 bg-white shadow-2xl",
        !open && "hidden",
      )}
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
      role="dialog"
      aria-label="Graphing calculator"
    >
      <div
        className="flex h-8 cursor-move items-center justify-between rounded-t-lg border-b border-neutral-200 bg-neutral-50 px-3 text-xs font-medium"
        onMouseDown={onDragStart}
      >
        <span>Graphing calculator</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close calculator"
          className="rounded p-1 hover:bg-neutral-200"
        >
          ✕
        </button>
      </div>
      <div className="absolute inset-x-0 bottom-0 top-8">
        {!loaded && (
          <div className="flex h-full items-center justify-center text-xs text-neutral-500">
            Loading calculator…
          </div>
        )}
        <div
          ref={containerRef}
          className={cn("h-full w-full", !loaded && "hidden")}
        />
      </div>
      <div
        className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize"
        onMouseDown={onResizeStart}
        aria-label="Resize calculator"
      >
        <div className="absolute bottom-1 right-1 h-2 w-2 border-b-2 border-r-2 border-neutral-400" />
      </div>
    </div>
  );
}
