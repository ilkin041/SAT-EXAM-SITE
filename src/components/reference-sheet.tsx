"use client";

import { RichHtml } from "@/components/rich-html";
import { REFERENCE_FORMULAS_HTML } from "@/components/reference-sheet-formulas.generated";

interface Props {
  open: boolean;
  onClose: () => void;
}

const NOTES = [
  "The arc of a circle measures 360°.",
  "The arc of a circle measures 2π radians.",
  "The sum of the interior angles of a triangle is 180°.",
];

/**
 * Static SAT-style geometry reference sheet. Opens as a modal on math sections.
 */
export function ReferenceSheet({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
      role="dialog"
      aria-label="Reference sheet"
    >
      <div
        className="w-full max-w-3xl rounded-xl border border-neutral-300 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-3">
          <h3 className="text-base font-semibold">Reference</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reference sheet"
            className="rounded p-1 hover:bg-neutral-100"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {REFERENCE_FORMULAS_HTML.map((f) => (
              <div
                key={f.title}
                className="rounded-md border border-neutral-200 bg-neutral-50/50 p-3"
              >
                <div className="text-xs font-medium text-neutral-600">{f.title}</div>
                <div className="mt-1">
                  <RichHtml html={f.html} />
                </div>
              </div>
            ))}
          </div>
          <ul className="mt-5 list-disc space-y-1 pl-5 text-xs text-neutral-600">
            {NOTES.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
