"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}

/**
 * Student-produced response input with iPad-aware keyboard handling.
 *
 * On iOS Safari (and other touch browsers that expose `visualViewport`),
 * when the soft keyboard opens it shrinks the visible viewport. If the
 * focused input sits below the new viewport top, the browser may scroll
 * the page in a way that pushes the test's top bar off-screen.
 *
 * We listen for `visualViewport.resize` and, when the input is hidden by
 * the keyboard, scroll *just enough* to bring it above the keyboard line.
 * We use `scrollIntoView` with `block: "nearest"` so already-visible inputs
 * aren't moved.
 */
export function SprInput({ value, onChange, placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (!vv) return;

    function ensureVisible() {
      if (!input || !vv) return;
      // Only react while this input has focus — otherwise other viewport
      // resizes (rotation, etc.) would yank random elements around.
      if (document.activeElement !== input) return;
      const rect = input.getBoundingClientRect();
      const visibleBottom = vv.height + vv.offsetTop;
      const visibleTop = vv.offsetTop;
      if (rect.bottom > visibleBottom || rect.top < visibleTop) {
        input.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }

    vv.addEventListener("resize", ensureVisible);
    vv.addEventListener("scroll", ensureVisible);

    function onFocus() {
      // The keyboard takes a frame to come up; defer the check until the
      // viewport has actually resized.
      setTimeout(ensureVisible, 250);
    }
    input.addEventListener("focus", onFocus);

    return () => {
      vv.removeEventListener("resize", ensureVisible);
      vv.removeEventListener("scroll", ensureVisible);
      input.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      inputMode="text"
      placeholder={placeholder}
      className={cn(
        "mt-2 w-64 rounded-md border border-neutral-400 bg-white px-3 py-2 text-base",
        "focus:border-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-700",
      )}
    />
  );
}
